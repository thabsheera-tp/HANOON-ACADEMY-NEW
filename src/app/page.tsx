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
  // Step 5: "payment" -> Manual UPI Payment / Pending Verification Screen
  // Step 6: "dashboard" -> Student Dashboard & Profile View
  const [currentScreen, setCurrentScreen] = useState<ScreenTab>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const targetScreen = params.get("screen");
      if (targetScreen === "payment") return "payment";
      if (targetScreen === "courses") return "courses";
      if (targetScreen === "dashboard") return "dashboard";
    }
    // Main domain / root route ("/") strictly defaults to Public Landing Page ("splash")
    return "splash";
  });
  const [accessNotice, setAccessNotice] = useState<string | null>(null);

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    let name = initialUser?.full_name || "";
    let phone = initialUser?.whatsapp_num || "";
    let place = initialUser?.district || "";

    if (typeof window !== "undefined" && (!name || !phone)) {
      try {
        const pendingRaw = localStorage.getItem("hanoon_pending_payment");
        if (pendingRaw) {
          const p = JSON.parse(pendingRaw);
          if (p.studentName && !name) name = p.studentName;
          if (p.studentPhone && !phone) phone = p.studentPhone;
        }
      } catch {}
    }
    return { name, phone, place };
  });

  // Selected Course (Defaults to Adaviyya or pending course)
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse>(() => {
    if (typeof window !== "undefined") {
      try {
        const pendingRaw = localStorage.getItem("hanoon_pending_payment");
        if (pendingRaw) {
          const p = JSON.parse(pendingRaw);
          if (p.courseId) {
            const found = SHOWCASE_COURSES.find((c) => c.id === p.courseId);
            if (found) return found;
          }
        }
      } catch {}
    }
    return SHOWCASE_COURSES[0];
  });

  // Payment Details
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>(() => {
    if (typeof window !== "undefined") {
      try {
        const pendingRaw = localStorage.getItem("hanoon_pending_payment");
        if (pendingRaw) {
          const p = JSON.parse(pendingRaw);
          if (p && (p.status === "PENDING" || p.status === "pending_verification")) {
            return {
              upiTxId: p.txId || "",
              amount: p.amount || SHOWCASE_COURSES[0].fee,
              submittedAt: p.submittedAt || "",
              status: "pending_verification",
            };
          }
        }
      } catch {}
    }
    return {
      upiTxId: "",
      amount: SHOWCASE_COURSES[0].fee,
      submittedAt: "",
      status: "unpaid",
    };
  });

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Check URL query parameters for access restriction notice or target screen
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const noticeParam = params.get("notice");
      const screenParam = params.get("screen");
      if (screenParam === "payment") {
        setCurrentScreen("payment");
      } else if (noticeParam) {
        setAccessNotice(noticeParam);
        setCurrentScreen("course-details");
      }
    }
  }, []);

  // Auto-Routing for Root Route: Check for active Supabase session when the app loads
  useEffect(() => {
    let isMounted = true;

    // If initialUser is not supplied (i.e. mounted at root "/"), check for active session
    if (!initialUser) {
      const checkAndRoute = async () => {
        const session = await checkActiveSupabaseSession();
        if (!isMounted) return;

        if (session && session.user) {
          if (session.user.role === "admin" || session.user.role === "super_admin") {
            router.replace("/admin");
            return;
          } else if (session.user.role === "teacher") {
            router.replace("/teacher");
            return;
          }
          // Students and guests remain on root route to view the first page
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

        // Also check hanoon_pending_payment if activePayment is not resolved yet
        if (!activePayment && typeof window !== "undefined") {
          try {
            const pendingRaw = localStorage.getItem("hanoon_pending_payment");
            if (pendingRaw) {
              const pendingData = JSON.parse(pendingRaw);
              if (
                pendingData &&
                (pendingData.status === "PENDING" || pendingData.status === "pending_verification")
              ) {
                activePayment = {
                  id: pendingData.paymentId,
                  upi_txid: pendingData.txId,
                  amount: pendingData.amount,
                  status: "PENDING",
                  course_id: pendingData.courseId,
                  submitted_at: pendingData.submittedAt,
                };
              }
            }
          } catch (e) {
            console.warn("Could not read pending payment cache:", e);
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

        // 5. Update student payment status in state without overriding root Landing Page
        if (isVerified && activePayment) {
          setPaymentDetails({
            upiTxId: activePayment.upi_txid,
            amount: typeof activePayment.amount === "number" ? `₹${activePayment.amount}` : activePayment.amount || "₹3000",
            submittedAt: activePayment.submitted_at || new Date().toLocaleTimeString(),
            status: "verified",
          });
          if (typeof window !== "undefined") {
            localStorage.removeItem("hanoon_pending_payment");
          }
        } else if (
          activePayment &&
          (activePayment.status === "PENDING" ||
            activePayment.status === "pending_verification")
        ) {
          setPaymentDetails({
            upiTxId: activePayment.upi_txid,
            amount: typeof activePayment.amount === "number" ? `₹${activePayment.amount}` : activePayment.amount || SHOWCASE_COURSES[0].fee,
            submittedAt: activePayment.submitted_at || new Date().toLocaleTimeString(),
            status: "pending_verification",
          });
        }
        // PREVENT AUTO-REDIRECT TO COURSES:
        // Root route ("/") must strictly remain on the Public Landing Page ("splash")
        // Users navigate to Course Catalog only when clicking "Get Started" or "Explore Courses"
      };

      verifyAndRoute();
    }
  }, [initialUser]);

  // Purge global React state upon user logout
  useEffect(() => {
    const handleLogout = () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("hanoon_pending_payment");
      }
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
                if (typeof window !== "undefined") {
                  localStorage.removeItem("hanoon_pending_payment");
                }
                setPaymentDetails((prev) => ({
                  ...prev,
                  status: "verified",
                }));
                setCurrentScreen("dashboard");
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
          if (typeof window !== "undefined") {
            localStorage.removeItem("hanoon_pending_payment");
          }
          setPaymentDetails((prev) => ({
            ...prev,
            status: "verified",
          }));
          setCurrentScreen("dashboard");
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
    // Treat name & phone number inputs strictly as lead/checkout info prior to payment approval.
    // Do NOT create an active student account session before payment is approved.
  };

  // Step 4 -> Step 5
  const handleProceedToPayment = () => {
    setCurrentScreen("payment");
  };

  // Step 5 -> Step 6 (Submit Verification)
  const handleSubmitPayment = (txId: string, paymentId?: string) => {
    const updatedDetails: PaymentDetails = {
      upiTxId: txId,
      amount: selectedCourse.fee,
      submittedAt: new Date().toLocaleTimeString(),
      status: "pending_verification",
    };
    setPaymentDetails(updatedDetails);

    // Save pending payment record locally to guarantee persistence across browser refreshes
    if (typeof window !== "undefined") {
      const pendingRecord = {
        txId,
        paymentId,
        courseId: selectedCourse.id,
        courseTitle: selectedCourse.title,
        amount: selectedCourse.fee,
        submittedAt: new Date().toLocaleTimeString(),
        studentName: userProfile.name,
        studentPhone: userProfile.phone,
        status: "PENDING",
      };
      localStorage.setItem("hanoon_pending_payment", JSON.stringify(pendingRecord));
    }

    // Keep student on pending verification screen without kicking them out
    setCurrentScreen("payment");
  };

  const handleBack = () => {
    if (currentScreen === "dashboard") setCurrentScreen("courses");
    else if (currentScreen === "payment") setCurrentScreen("splash");
    else if (currentScreen === "onboarding") setCurrentScreen("course-details");
    else if (currentScreen === "course-details") setCurrentScreen("courses");
    else if (currentScreen === "courses") {
      setCurrentScreen("splash");
    }
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
      if (hasPaymentSubmitted || paymentDetails.status === "pending_verification") {
        setCurrentScreen("payment");
      } else {
        setAccessNotice("Please complete enrollment to access your dashboard.");
        setCurrentScreen("course-details");
      }
    }
  }, [currentScreen, isEnrolled, hasPaymentSubmitted, paymentDetails.status]);

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
          onGoHome={() => setCurrentScreen("splash")}
          canGoBack={canGoBack}
          userProfile={userProfile}
          isApproved={isEnrolled}
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
          {/* Step 1: Welcome Screen (Ultra-minimalist branding & direct route to /courses) */}
          {currentScreen === "splash" && (
            <ScreenSplash
              onGetStarted={() => setCurrentScreen("courses")}
              onExploreCourses={() => setCurrentScreen("courses")}
              onStaffLogin={() => router.push("/login?portal=staff")}
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
