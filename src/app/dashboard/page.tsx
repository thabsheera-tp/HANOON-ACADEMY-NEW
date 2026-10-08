"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkActiveSupabaseSession } from "@/services/authService";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardRouteGuardPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const enforceAccessControl = async () => {
      // 1. Verify user authentication session
      const session = await checkActiveSupabaseSession();
      if (!isMounted) return;

      if (!session || !session.user) {
        router.replace("/login?reason=unauthenticated");
        return;
      }

      if (session.user.role === "admin") {
        router.replace("/admin");
        return;
      }

      if (session.user.role === "teacher") {
        router.replace("/teacher");
        return;
      }

      // 2. Query Supabase for student's payment / enrollment verification status
      const cleanPhone = (session.user.whatsapp_num || "").replace(/\D/g, "");
      let isApproved = false;

      if (cleanPhone && supabase) {
        try {
          const { data: dbPayments, error } = await supabase
            .from("payments")
            .select("*")
            .order("created_at", { ascending: false });

          if (!error && dbPayments && dbPayments.length > 0) {
            const studentPayment = dbPayments.find(
              (p: any) =>
                p.student_phone === cleanPhone ||
                (p.upi_txid && p.upi_txid.includes(cleanPhone))
            );

            if (studentPayment) {
              const st = (studentPayment.status || "").toUpperCase();
              if (st === "APPROVED" || st === "VERIFIED" || st === "ACTIVE") {
                isApproved = true;
              }
            }
          }
        } catch (err) {
          console.warn("Could not query Supabase payments in /dashboard guard:", err);
        }
      }

      // Fallback check in local storage if offline/demo
      if (!isApproved && typeof window !== "undefined") {
        try {
          const localPayments = JSON.parse(localStorage.getItem("hanoon_payments") || "[]");
          const localMatch = localPayments.find(
            (p: any) =>
              p.student?.id === session.user.id ||
              (cleanPhone && p.student?.whatsapp_num === cleanPhone)
          );
          if (localMatch) {
            const st = (localMatch.status || "").toUpperCase();
            if (st === "APPROVED" || st === "VERIFIED" || st === "ACTIVE") {
              isApproved = true;
            }
          }
        } catch (e) {
          console.warn("Could not check local payments in /dashboard guard:", e);
        }
      }

      if (!isMounted) return;

      // 3. IF the user status is NOT 'APPROVED' (i.e., 'UNPAID', 'PENDING', or 'NOT_ENROLLED'):
      // Redirect immediately to Course Catalog / Details with notice
      if (!isApproved) {
        const noticeParam = encodeURIComponent("Please complete enrollment to access your dashboard.");
        router.replace(`/student?notice=${noticeParam}`);
        return;
      }

      // 4. UNLOCK UPON VERIFICATION: If status is 'APPROVED' / 'ACTIVE', direct to student dashboard
      router.replace("/student");
    };

    enforceAccessControl();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-purple-50/50 flex justify-center items-center font-['Plus_Jakarta_Sans'] select-none">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
        <span className="text-xs font-semibold text-purple-700">Verifying Dashboard Access...</span>
      </div>
    </div>
  );
}
