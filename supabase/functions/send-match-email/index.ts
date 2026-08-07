import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailContext {
  claimantName: string;
  claimantEmail: string;
  itemTitle: string;
  itemLocation: string;
  itemDate: string;
  finderName: string;
  finderEmail: string;
  finderPhone: string | null;
}

function buildEmailBody(ctx: EmailContext): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0d9488, #14b8a6); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 Your claim has been approved!</h1>
      </div>
      <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #374151; font-size: 16px;">Hello <strong>${ctx.claimantName}</strong>,</p>
        <p style="color: #374151; font-size: 16px;">Great news! An admin has approved your claim for the found item below. You can now contact the finder directly to coordinate the return.</p>

        <div style="background: #d1fae5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="color: #065f46; margin: 0 0 8px;">✅ Found Item</h3>
          <p style="color: #064e3b; margin: 0 0 4px;"><strong>Item:</strong> ${ctx.itemTitle}</p>
          <p style="color: #064e3b; margin: 0 0 4px;"><strong>Location:</strong> ${ctx.itemLocation}</p>
          <p style="color: #064e3b; margin: 0;"><strong>Date Found:</strong> ${ctx.itemDate}</p>
        </div>

        <div style="background: #ede9fe; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="color: #5b21b6; margin: 0 0 8px;">👤 Finder's Contact Details</h3>
          <p style="color: #4c1d95; margin: 0 0 4px;"><strong>Name:</strong> ${ctx.finderName}</p>
          <p style="color: #4c1d95; margin: 0 0 4px;"><strong>Email:</strong> ${ctx.finderEmail}</p>
          ${ctx.finderPhone ? `<p style="color: #4c1d95; margin: 0;"><strong>Phone:</strong> ${ctx.finderPhone}</p>` : ''}
        </div>

        <p style="color: #374151; font-size: 16px;">Please reach out promptly to coordinate the handover.</p>
        <p style="color: #6b7280; font-size: 14px;">Thank you for using the Lost and Found System.</p>
      </div>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { claim_id } = await req.json();
    if (!claim_id || typeof claim_id !== "string") {
      return new Response(JSON.stringify({ error: "claim_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is authenticated and is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authErr } = await supabaseUserClient.auth.getClaims(token);
    if (authErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Confirm caller is admin
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load claim, item, claimant + finder profiles
    const { data: claim, error: claimErr } = await supabase
      .from("claims").select("*").eq("id", claim_id).maybeSingle();
    if (claimErr || !claim) {
      return new Response(JSON.stringify({ error: "Claim not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (claim.status !== "approved") {
      return new Response(JSON.stringify({ error: "Claim is not approved" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: item }, { data: claimant }] = await Promise.all([
      supabase.from("items").select("*").eq("id", claim.found_item_id).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", claim.claimant_id).maybeSingle(),
    ]);
    if (!item || !claimant) {
      return new Response(JSON.stringify({ error: "Item or claimant missing" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: finder } = await supabase
      .from("profiles").select("*").eq("user_id", item.user_id).maybeSingle();
    if (!finder) {
      return new Response(JSON.stringify({ error: "Finder profile missing" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: skip if already emailed for this claim
    const { data: existing } = await supabase
      .from("email_notifications")
      .select("id")
      .eq("claim_id", claim_id)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ success: true, message: "Already notified" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ctx: EmailContext = {
      claimantName: claimant.username,
      claimantEmail: claimant.email,
      itemTitle: item.title,
      itemLocation: item.location,
      itemDate: item.date,
      finderName: finder.username,
      finderEmail: finder.email,
      finderPhone: finder.phone,
    };

    const smtpEmail = Deno.env.get("SMTP_EMAIL")!;
    const smtpPassword = Deno.env.get("SMTP_PASSWORD")!;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: smtpEmail, pass: smtpPassword },
    });

    let emailSent = false;
    let errMsg = "";
    try {
      await transporter.sendMail({
        from: `"Lost & Found System" <${smtpEmail}>`,
        to: ctx.claimantEmail,
        subject: `Your claim has been approved — ${ctx.itemTitle}`,
        html: buildEmailBody(ctx),
      });
      emailSent = true;
      console.log(`✅ Email sent to ${ctx.claimantEmail}`);
    } catch (emailError) {
      errMsg = String(emailError);
      console.error("❌ Failed to send email:", emailError);
    }

    await supabase.from("email_notifications").insert({
      claim_id,
      recipient_email: ctx.claimantEmail,
      status: emailSent ? "sent" : "failed",
    });

    // Mark item as resolved on successful email
    if (emailSent) {
      await supabase.from("items").update({ is_resolved: true }).eq("id", item.id);
    }

    return new Response(
      JSON.stringify({ success: emailSent, message: emailSent ? "Email sent" : `Failed: ${errMsg}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ Error in send-match-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
