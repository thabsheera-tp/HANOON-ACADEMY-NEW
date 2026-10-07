"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileAppShell from "@/app/page";
import { getCurrentSession, UserProfileRecord } from "@/services/authService";

export default function StudentPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfileRecord | null>(null);

  useEffect(() => {
    const session = getCurrentSession();
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

    setCurrentUser(session.user);
  }, [router]);

  return <MobileAppShell initialUser={currentUser} />;
}
