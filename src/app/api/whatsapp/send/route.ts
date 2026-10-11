import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, phone, studentName, courseName, liveLink, message } = body;

    // Optional environment variable hooks for external WhatsApp Gateway integrations
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

    const interaktApiKey = process.env.INTERAKT_API_KEY;

    let providerResult: any = { simulated: true, provider: "wa.me-direct" };

    // 1. Hook for Twilio WhatsApp API (if configured in .env.local)
    if (twilioAccountSid && twilioAuthToken && phone) {
      try {
        const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const params = new URLSearchParams();
        params.append("From", twilioWhatsAppFrom);
        params.append("To", `whatsapp:+${phone}`);
        params.append("Body", message);

        const twilioRes = await fetch(twilioEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        if (twilioRes.ok) {
          const twilioData = await twilioRes.json();
          providerResult = { simulated: false, provider: "twilio", sid: twilioData.sid };
        }
      } catch (twilioErr) {
        console.warn("Twilio WhatsApp Gateway attempt failed:", twilioErr);
      }
    }

    // 2. Hook for Interakt WhatsApp API (if configured in .env.local)
    else if (interaktApiKey && phone) {
      try {
        const interaktRes = await fetch("https://api.interakt.ai/v1/public/message/", {
          method: "POST",
          headers: {
            Authorization: `Basic ${interaktApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            countryCode: "+91",
            phoneNumber: phone.replace(/^91/, ""),
            type: "Template",
            template: {
              name: type === "PAYMENT_VERIFIED" ? "payment_approved_malayalam" : "live_class_15min_reminder",
              languageCode: "ml",
              bodyValues: type === "PAYMENT_VERIFIED" ? [studentName] : [studentName, courseName || "Course", liveLink || ""],
            },
          }),
        });

        if (interaktRes.ok) {
          const interaktData = await interaktRes.json();
          providerResult = { simulated: false, provider: "interakt", id: interaktData.id };
        }
      } catch (interaktErr) {
        console.warn("Interakt WhatsApp Gateway attempt failed:", interaktErr);
      }
    }

    // Log alert dispatch
    console.log(`[WhatsApp Alert Triggered] Type: ${type} | Recipient: ${studentName} (${phone}) | Provider: ${providerResult.provider}`);

    return NextResponse.json({
      success: true,
      type,
      recipient: { studentName, phone },
      message,
      gateway: providerResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("WhatsApp API Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
