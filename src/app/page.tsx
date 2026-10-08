"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import ScreenSplash from "@/components/mobile/ScreenSplash";
import ScreenCoursesList, { SHOWCASE_COURSES } from "@/components/mobile/ScreenCoursesList";
import ScreenCourseDetails from "@/components/mobile/ScreenCourseDetails";
import ScreenOnboarding from "@/components/mobile/ScreenOnboarding";
import ScreenPayment from "@/components/mobile/ScreenPayment";
import ScreenDashboard from "@/components/mobile/ScreenDashboard";
import ReceiptModal from "@/components/mobile/ReceiptModal";
import { Lock, X } from "lucide-react";
import { UserProfile, SelectedCourse, PaymentDetails, ScreenTab } from "@/types/app";
import {
  getCurrentSession,
  setAuthSession,
  checkActiveSupabaseSession,
  fetchUserLiveProfile,
  UserProfileRecord,
} from "@/services/authService";

interface MobileAppShellProps {
  initialUser?: UserProfileRecord | null;
}

export default function MobileAppShell({ initialUser }: MobileAppShellProps = {}) {
  const router = useRouter();
  // 6-Step Workflow:
  // Step 1: "splash" -> Welcome Screen (Only for unauthenticated visitors)
  // Step 2: "courses" -> Course Selection View
  // Step 3: "course-details" -> Course Details & Pricing Sheet
  // Step 4: "onboarding" -> Student Onboarding Form
  // Step 5: "payment" -> Manual UPI Payment Screen
  // Step 6: "dashboard" -> Student Dashboard & Profile View
  const [currentScreen, setCurrentScreen] = useState<ScreenTab>(
    initialUser ? "courses" : "splash"
  );
  const [accessNotice, setAccessNotice] = useState<string | null>(null);

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: initialUser?.full_name || "",
    phone: initialUser?.whatsapp_num || "",
    place: initialUser?.district || "",
  });

  // Selected Course (Defaults to Adaviyya)
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse>(SHOWCASE_COURSES[0]);

  // Payment Details
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    upiTxId: "",
    amount: SHOWCASE_COURSES[0].fee,
    submittedAt: "",
    status: "unpaid",
  });

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Check URL query parameters for access restriction notice
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const noticeParam = params.get("notice");
      if (noticeParam) {
        setAccessNotice(noticeParam);
      }
    }
  }, []);

  // Auto-Routing for Root Route: Check for active Supabase session when the app loads
  useEffect(() => {
    let isMounted = true;

    // If initialUser is not supplied (i.e. mounted at root "/"), check for active session and bypass welcome screen
    if (!initialUser) {
      const checkAndRoute = async () => {
        const session = await checkActiveSupabaseSession();
        if (!isMounted) return;

        if (session && session.user) {
          if (session.user.role === "admin") {
            router.replace("/admin");
          } else if (session.user.role === "teacher") {
            router.replace("/teacher");
          } else {
            router.replace("/student");
          }
        }
      };

      checkAndRoute();
    }

    return () => {
      isMounted = false;
    };
  }, [initialUser, router]);

  // Dynamic State Fetching: Fetch the current authenticated user's actual full_name from Supabase students/profiles table
  useEffect(() => {
    const session = getCurrentSession();
    const activeUser = initialUser || session?.user;

    if (activeUser) {
      // Set active user state immediately
      setUserProfile({
        name: activeUser.full_name || "",
        phone: activeUser.whatsapp_num || "",
        place: activeUser.district || "",
      });

      const verifyAndRoute = async () => {
        // 1. Dynamically fetch latest profile from Supabase using user.id to guarantee fresh state
        try {
          const liveProfile = await fetchUserLiveProfile(
            activeUser.id,
            activeUser.whatsapp_num
          );
          if (liveProfile.fullName && liveProfile.fullName !== activeUser.full_name) {
            setUserProfile((prev) => ({
              ...prev,
              name: liveProfile.fullName || prev.name,
              place: liveProfile.district || prev.place,
              phone: liveProfile.phone || prev.phone,
            }));
          }
        } catch (e) {
          console.warn("Could not dynamically fetch live user profile:", e);
        }

        let isVerified = false;
        let activePayment: any = null;
        const cleanPhone = activeUser.whatsapp_num
          ? activeUser.whatsapp_num.replace(/\D/g, "")
          : "";

        // 2. Strict Live Payment Verification via Supabase for THIS user
        if (cleanPhone) {
          try {
            const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
            if (isSupabaseConfigured && supabase) {
              const { data: studentRecord } = await supabase
                .from("students")
                .select("id, full_name, payments(*)")
                .eq("whatsapp_num", cleanPhone)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (studentRecord) {
                if (studentRecord.full_name && studentRecord.full_name.trim()) {
                  setUserProfile((prev) => ({
                    ...prev,
                    name: studentRecord.full_name.trim(),
                  }));
                }

                if (studentRecord.payments && Array.isArray(studentRecord.payments)) {
                  const approved = studentRecord.payments.find(
                    (p: any) =>
                      p.status === "APPROVED" ||
                      p.status === "verified" ||
                      p.status === "ACTIVE"
                  );
                  if (approved) {
                    isVerified = true;
                    activePayment = approved;
                    localStorage.setItem(
                      "hanoon_local_payments",
                      JSON.stringify(studentRecord.payments)
                    );
                  } else if (studentRecord.payments.length > 0) {
                    activePayment = studentRecord.payments[0];
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Supabase persistence check warning:", e);
          }
        }

        // 3. Check local storage cache ONLY if matching this student
        if (!isVerified) {
          try {
            const savedPaymentsRaw = localStorage.getItem("hanoon_local_payments");
            if (savedPaymentsRaw) {
              const payments = JSON.parse(savedPaymentsRaw);
              if (Array.isArray(payments) && payments.length > 0) {
                const userMatch = payments.find(
                  (p: any) =>
                    p.student_id === activeUser.id ||
                    p.student?.id === activeUser.id ||
                    (cleanPhone && p.student?.whatsapp_num === cleanPhone)
                );
                if (userMatch) {
                  if (
                    userMatch.status === "APPROVED" ||
                    userMatch.status === "verified" ||
                    userMatch.status === "ACTIVE"
                  ) {
                    isVerified = true;
                  }
                  activePayment = userMatch;
                }
              }
            }
          } catch (e) {
            console.warn("Could not read local payment session:", e);
          }
        }

        // 4. Resolve Enrolled Course dynamically from user's payment record
        if (activePayment && activePayment.course_id) {
          const matchedCourse = SHOWCASE_COURSES.find(
            (c) =>
              c.id === activePayment.course_id ||
              (activePayment.course_id === "shamail" && c.id.includes("shamail"))
          );
          if (matchedCourse) {
            setSelectedCourse(matchedCourse);
          }
        }

        // 5. If verified, route DIRECTLY to Student Dashboard
        if (isVerified && activePayment) {
          setPaymentDetails({
            upiTxId: activePayment.upi_txid,
            amount: `₹${activePayment.amount || 3000}`,
            submittedAt: activePayment.submitted_at || new Date().toLocaleTimeString(),
            status: "verified",
          });
          setCurrentScreen("dashboard");
        } else if (
          activePayment &&
          (activePayment.status === "PENDING" ||
            activePayment.status === "pending_verification")
        ) {
          setPaymentDetails({
            upiTxId: activePayment.upi_txid,
            amount: `₹${activePayment.amount || 3000}`,
            submittedAt: activePayment.submitted_at || new Date().toLocaleTimeString(),
            status: "pending_verification",
          });
          // Unpaid / pending students can ONLY view Course Details or catalog, never dashboard
          setCurrentScreen("course-details");
        } else {
          // If student is authenticated but has not paid yet, route to Course Selection
          setCurrentScreen("courses");
        }
      };

      verifyAndRoute();
    }
  }, [initialUser]);

  // Purge global React state upon user logout
  useEffect(() => {
    const handleLogout = () => {
      setUserProfile({ name: "", phone: "", place: "" });
      setPaymentDetails({
        upiTxId: "",
        amount: SHOWCASE_COURSES[0].fee,
        submittedAt: "",
        status: "unpaid",
      });
      setCurrentScreen("splash");
    };

    window.addEventListener("hanoon_logout_event", handleLogout);
    return () => {
      window.removeEventListener("hanoon_logout_event", handleLogout);
    };
  }, []);

  // Real-time automatic unlock subscription across tabs and database events
  useEffect(() => {
    let realtimeChannel: any = null;
    const setupRealtime = async () => {
      const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
      if (isSupabaseConfigured && supabase) {
        realtimeChannel = supabase
          .channel("page_student_payment_unlock")
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "payments",
            },
            (payload) => {
              const updated = payload.new as any;
              if (
                updated &&
                (updated.status === "APPROVED" || updated.status === "verified")
              ) {
                setPaymentDetails((prev) => ({
                  ...prev,
                  status: "verified",
                }));
              }
            }
          )
          .subscribe();
      }
    };

    setupRealtime();

    const handleLocalPayment = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        const { status } = customEvt.detail;
        if (status === "APPROVED" || status === "verified") {
          setPaymentDetails((prev) => ({
            ...prev,
            status: "verified",
          }));
        }
      }
    };

    window.addEventListener("hanoon_payment_event", handleLocalPayment);

    return () => {
      if (realtimeChannel) {
        import("@/lib/supabaseClient").then(({ supabase }) => {
          if (supabase) supabase.removeChannel(realtimeChannel);
        });
      }
      window.removeEventListener("hanoon_payment_event", handleLocalPayment);
    };
  }, []);

  // Step 1 -> Step 2
  const handleExploreCourses = () => {
    setCurrentScreen("courses");
  };

  // Step 2 -> Step 3
  const handleSelectCourse = (course: SelectedCourse) => {
    setSelectedCourse(course);
    setPaymentDetails((prev) => ({
      ...prev,
      amount: course.fee,
    }));
    setCurrentScreen("course-details");
  };

  // Step 3 -> Step 4 (Progressive Enrollment directly to Payment Explanation Screen)
  const handleProceedToRegister = () => {
    setCurrentScreen("payment");
  };

  const handleSaveProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    setAuthSession({
      id: `usr-std-${Date.now()}`,
      email: `${profile.name.toLowerCase().replace(/\s+/g, "") || "student"}@student.hanoon.academy`,
      full_name: profile.name,
      role: "student",
      district: profile.place,
      whatsapp_num: profile.phone,
    });
  };

  // Step 4 -> Step 5
  const handleProceedToPayment = () => {
    setCurrentScreen("payment");
  };

  // Step 5 -> Step 6 (Submit Verification)
  const handleSubmitPayment = (txId: string) => {
    setPaymentDetails({
      upiTxId: txId,
      amount: selectedCourse.fee,
      submittedAt: new Date().toLocaleTimeString(),
      status: "pending_verification",
    });

    if (userProfile.name) {
      setAuthSession({
        id: `usr-std-${Date.now()}`,
        email: `${userProfile.name.toLowerCase().replace(/\s+/g, "") || "student"}@student.hanoon.academy`,
        full_name: userProfile.name,
        role: "student",
        district: userProfile.place,
        whatsapp_num: userProfile.phone,
      });
    }

    // After submitting manual payment, keep student on payment receipt/pending state until verified
    setCurrentScreen("payment");
  };

  const handleBack = () => {
    if (currentScreen === "dashboard") setCurrentScreen("courses");
    else if (currentScreen === "payment") setCurrentScreen("course-details");
    else if (currentScreen === "onboarding") setCurrentScreen("course-details");
    else if (currentScreen === "course-details") setCurrentScreen("courses");
    else if (currentScreen === "courses") setCurrentScreen("splash");
  };

  const canGoBack = currentScreen !== "splash";
  const isEnrolled =
    paymentDetails.status === "verified" ||
    (paymentDetails.status as string) === "APPROVED" ||
    (paymentDetails.status as string) === "ACTIVE";
  const hasPaymentSubmitted = paymentDetails.status === "pending_verification";

  // Route Guard: Restrict Dashboard access strictly to APPROVED / ACTIVE students
  useEffect(() => {
    if (currentScreen === "dashboard" && !isEnrolled) {
      setAccessNotice("Please complete enrollment to access your dashboard.");
      setCurrentScreen("course-details");
    }
  }, [currentScreen, isEnrolled]);

  const handleSelectScreen = (screen: ScreenTab) => {
    if (screen === "dashboard" && !isEnrolled) {
      setAccessNotice("Please complete enrollment to access your dashboard.");
      setCurrentScreen("course-details");
      return;
    }
    setCurrentScreen(screen);
  };

  return (
    <div className="min-h-screen bg-purple-50/50 flex justify-center items-center sm:py-6 selection:bg-purple-100 selection:text-purple-700">
      {/* ========================================================
          MOBILE APP SHELL (Clean, Flat, Modern Soft Purple & White)
          ======================================================== */}
      <div className="w-full max-w-md mx-auto min-h-screen sm:min-h-[844px] sm:max-h-[92vh] bg-white text-slate-900 sm:rounded-[36px] shadow-xl sm:border sm:border-purple-100 flex flex-col overflow-hidden relative">
        
        {/* Mobile Header with Status Bar & Back Navigation */}
        <MobileHeader
          currentScreen={currentScreen}
          onBack={handleBack}
          canGoBack={canGoBack}
          userProfile={userProfile}
        />

        {/* Access Notice Banner (Displayed if an unpaid student attempts to access dashboard) */}
        {accessNotice && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in shadow-xs z-20 shrink-0">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{accessNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setAccessNotice(null)}
              className="p-1 rounded-lg text-amber-700 hover:text-amber-950 hover:bg-amber-100 transition-colors cursor-pointer"
              aria-label="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto flex flex-col relative z-10 bg-white">
          {/* Step 1: Welcome Screen (Ultra-minimalist branding & direct route to /login) */}
          {currentScreen === "splash" && (
            <ScreenSplash
              onGetStarted={() => router.push("/login")}
            />
          )}

          {/* Step 2: Course Selection View */}
          {currentScreen === "courses" && (
            <ScreenCoursesList onSelectCourse={handleSelectCourse} />
          )}

          {/* Step 3: Course Details & Pricing Sheet */}
          {currentScreen === "course-details" && (
            <ScreenCourseDetails
              selectedCourse={selectedCourse}
              onProceedToRegister={handleProceedToRegister}
              onBackToCourses={() => setCurrentScreen("courses")}
              paymentDetails={paymentDetails}
              isPaid={isEnrolled}
              onGoToDashboard={() => handleSelectScreen("dashboard")}
            />
          )}

          {/* Step 4: Student Onboarding Form */}
          {currentScreen === "onboarding" && (
            <ScreenOnboarding
              userProfile={userProfile}
              selectedCourse={selectedCourse}
              onSaveProfile={handleSaveProfile}
              onProceedToPayment={handleProceedToPayment}
              onBackToCourse={() => setCurrentScreen("course-details")}
            />
          )}

          {/* Step 5: Manual UPI Payment Screen */}
          {currentScreen === "payment" && (
            <ScreenPayment
              userProfile={userProfile}
              selectedCourse={selectedCourse}
              paymentDetails={paymentDetails}
              onSubmitPayment={handleSubmitPayment}
              onGoToDashboard={() => handleSelectScreen("dashboard")}
              onOpenReceipt={() => setIsReceiptOpen(true)}
              onSaveProfile={handleSaveProfile}
            />
          )}

          {/* Step 6: Student Dashboard & Profile View (Strictly gated for APPROVED/ACTIVE students) */}
          {currentScreen === "dashboard" && isEnrolled && (
            <ScreenDashboard
              userProfile={userProfile}
              selectedCourse={selectedCourse}
              paymentDetails={paymentDetails}
              onChangeCourse={() => setCurrentScreen("courses")}
              onOpenReceipt={() => setIsReceiptOpen(true)}
            />
          )}
        </div>

        {/* Sticky Mobile Bottom Navigation (Visible on Screens 2 to 6) */}
        <MobileBottomNav
          currentScreen={currentScreen}
          onChangeScreen={handleSelectScreen}
          isEnrolled={isEnrolled}
          hasPaymentSubmitted={hasPaymentSubmitted}
        />
      </div>

      {/* Official Fee Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        userProfile={userProfile}
        selectedCourse={selectedCourse}
        paymentDetails={paymentDetails}
      />

    </div>
  );
}
