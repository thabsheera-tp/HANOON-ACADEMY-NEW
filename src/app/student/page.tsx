"use client";

import React, { useEffect, useState } from "react";
import MobileAppShell from "@/app/page";
import { getCurrentSession, UserProfileRecord } from "@/services/authService";

export default function StudentPage() {
  const [currentUser, setCurrentUser] = useState<UserProfileRecord | null>(null);

  useEffect(() => {
    const session = getCurrentSession();
    if (session && session.user) {
      setCurrentUser(session.user);
    }
  }, []);

  return <MobileAppShell initialUser={currentUser} />;
}
