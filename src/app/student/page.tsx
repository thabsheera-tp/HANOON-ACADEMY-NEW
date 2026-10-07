"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileAppShell from "@/app/page";
import {
  checkActiveSupabaseSession,
  fetchUserLiveProfile,
  UserProfileRecord,
} from "@/services/authService";

export default function StudentPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfileRecord | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const session = await checkActiveSupabaseSession();
      if (!isMounted) return;

      if (!session || !session.user) {
        router.replace("/login");
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

      // Dynamically fetch current user's actual full_name from Supabase students/profiles
      try {
        const liveProfile = await fetchUserLiveProfile(
          session.user.id,
          session.user.whatsapp_num
        );
        const verifiedUser: UserProfileRecord = {
          ...session.user,
          full_name: liveProfile.fullName || session.user.full_name,
          district: liveProfile.district || session.user.district,
          whatsapp_num: liveProfile.phone || session.user.whatsapp_num,
        };

        if (isMounted) {
          setCurrentUser(verifiedUser);
          setIsVerifying(false);
        }
      } catch (err) {
        console.warn("Could not fetch live student profile:", err);
        if (isMounted) {
          setCurrentUser(session.user);
          setIsVerifying(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-purple-50/50 flex justify-center items-center font-['Plus_Jakarta_Sans'] select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-purple-700">Loading Student Portal...</span>
        </div>
      </div>
    );
  }

  return <MobileAppShell initialUser={currentUser} />;
}
