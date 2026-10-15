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
import ScreenPendingVerification from "@/components/mobile/ScreenPendingVerification";
import ScreenDashboard from "@/components/mobile/ScreenDashboard";
import ReceiptModal from "@/components/mobile/ReceiptModal";
import StudentRegisterModal from "@/components/mobile/StudentRegisterModal";
import { saveStudentLead } from "@/services/studentService";
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
  // 5-Screen Sequential Flow:
  // Screen 1: "splash" -> Welcome Landing Page with Hanoon Academy Logo and Get Started button
  // Screen 2: "onboarding" -> Student Onboarding / Auth Form (Name, Phone, Place, Age)
  // Screen 3: "courses" & "course-details" -> Course Exploration & Selection
  // Screen 4: "payment" -> Direct UPI Payment (QR code, UPI ID, TxID form)
  // Screen 5: "pending-verification" -> Verification Pending ("Payment Under Review")
  const [currentScreen, setCurrentScreen] = useState<ScreenTab>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const targetScreen = params.get("screen") as ScreenTab;
      if (targetScreen) {
        if (targetScreen === "dashboard") return "dashboard";
        if (targetScreen === "pending-verification") return "pending-verification";
        if (targetScreen === "payment") return "payment";
        if (targetScreen === "courses" || targetScreen === "course-details" || targetScreen === "onboarding") {
          return targetScreen;
        }
      }
      // If student is verified and enrolled in local storage, route directly to dashboard
      const isEnrolled = localStorage.getItem("hanoon_student_enrolled") === "true";
      if (isEnrolled) {
        return "dashboard";
      }
      // If student has a pending payment submitted, show pending-verification screen
      const pendingRaw = localStorage.getItem("hanoon_pending_payment");
      if (pendingRaw) {
        try {
          const p = JSON.parse(pendingRaw);
          if (
            p &&
            ((p.status || "").toUpperCase() === "PENDING" ||
              p.status === "pending_verification")
          ) {
            return "pending-verification";
          }
        } catch {}
      }
    }
    // Screen 1 (Welcome Landing Page): Visitors strictly land on Welcome Splash Screen
    return "splash";
  });
  const [accessNotice, setAccessNotice] = useState<string | null>(null);

  // User Profile (Initialized cleanly without staff/admin credentials)
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    let name = initialUser?.full_name || "";
    let phone = initialUser?.whatsapp_num || "";
    let place = initialUser?.district || "";
    let age = "";

    const isStaffOrOfficer = (val?: string) => {
      const lower = (val || "").toLowerCase();
      return (
        lower.includes("officer") ||
        lower.includes("staff") ||
        lower.includes("admin") ||
        lower.includes("verifier")
      );
    };

    if (
      initialUser &&
      (initialUser.role !== "student" || isStaffOrOfficer(initialUser.full_name))
    ) {
      name = "";
      place = "";
      phone = "";
    }

    if (typeof window !== "undefined") {
      try {
        const savedProfileRaw = localStorage.getItem("hanoon_student_profile");
        if (savedProfileRaw) {
          const sp = JSON.parse(savedProfileRaw);
          if (sp.name && !isStaffOrOfficer(sp.name)) name = sp.name;
          if (sp.phone) phone = sp.phone;
          if (sp.place && !isStaffOrOfficer(sp.place)) place = sp.place;
          if (sp.age) age = sp.age;
        }
      } catch {}

      if (!name || !phone) {
        try {
          const pendingRaw = localStorage.getItem("hanoon_pending_payment");
          if (pendingRaw) {
            const p = JSON.parse(pendingRaw);
            if (p.studentName && !name && !isStaffOrOfficer(p.studentName))
              name = p.studentName;
            if (p.studentPhone && !phone) phone = p.studentPhone;
          }
        } catch {}
      }
    }

    if (isStaffOrOfficer(name)) {
      name = "";
      place = "";
    }

    return { name, phone, place, age };
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
        const isEnrolled = localStorage.getItem("hanoon_student_enrolled") === "true";
        if (isEnrolled) {
          return {
            upiTxId: "VERIFIED",
            amount: SHOWCASE_COURSES[0].fee,
            submittedAt: "",
            status: "verified",
          };
        }
        const pendingRaw = localStorage.getItem("hanoon_pending_payment");
        if (pendingRaw) {
          const p = JSON.parse(pendingRaw);
          if (
            p &&
            ((p.status || "").toUpperCase() === "PENDING" ||
              p.status === "pending_verification") &&
            p.txId &&
            p.txId !== "Pending Verification"
          ) {
            return {
              upiTxId: p.txId || "",
              amount: p.amount || SHOWCASE_COURSES[0].fee,
              submittedAt: p.submittedAt || "",
              status: "pending_verification",
              screenshotUrl: p.screenshotUrl || undefined,
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
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Check URL query parameters for access restriction notice
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const noticeParam = params.get("notice");
      if (noticeParam) {
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

  // Dynamic State Fetching: Fetch current authenticated student's profile or verified enrollment from Supabase
  useEffect(() => {
    let isMounted = true;

    const verifyAndRoute = async () => {
      const session = getCurrentSession();
      const activeUser = initialUser || session?.user;

      const isStaffOrOfficer = (u: any) => {
        if (!u) return false;
        if (u.role && u.role !== "student") return true;
        const lower = (u.full_name || "").toLowerCase();
        return (
          lower.includes("officer") ||
          lower.includes("staff") ||
          lower.includes("admin") ||
          lower.includes("verifier")
        );
      };

      // If active user is staff/admin/verifier, do NOT treat them as a student profile on the student portal
      if (activeUser && isStaffOrOfficer(activeUser)) {
        return;
      }

      // Collect student identification from Auth session, local state, or cached enrollment
      let studentPhone = activeUser?.whatsapp_num || userProfile.phone || "";
      let studentName = activeUser?.full_name || userProfile.name || "";
      let txId = paymentDetails.upiTxId || "";
      let pendingPaymentId = "";

      if (typeof window !== "undefined") {
        try {
          const savedProf = localStorage.getItem("hanoon_student_profile");
          if (savedProf) {
            const sp = JSON.parse(savedProf);
            if (!studentPhone && sp.phone) studentPhone = sp.phone;
            if (!studentName && sp.name && !isStaffOrOfficer(sp.name)) studentName = sp.name;
          }
          const pendingRaw = localStorage.getItem("hanoon_pending_payment");
          if (pendingRaw) {
            const p = JSON.parse(pendingRaw);
            if (!studentPhone && p.studentPhone) studentPhone = p.studentPhone;
            if (!studentName && p.studentName && !isStaffOrOfficer(p.studentName)) studentName = p.studentName;
            if (!txId && p.txId && p.txId !== "Pending Verification") txId = p.txId;
            if (p.paymentId) pendingPaymentId = p.paymentId;
          }
        } catch {}
      }

      const cleanPhone = (studentPhone || "").replace(/\D/g, "");
      const cleanTxId = (txId || "").trim();

      // If no student phone or txId or paymentId, no verification query needed
      if (!cleanPhone && !cleanTxId && !pendingPaymentId && !activeUser) {
        return;
      }

      // If active user is authenticated student, update profile name
      if (activeUser && activeUser.role === "student") {
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
      }

      let isVerified = false;
      let isPending = false;
      let activePayment: any = null;

      try {
        const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
        if (isSupabaseConfigured && supabase) {
          // 1. Check by student phone number in students table
          if (cleanPhone) {
            const { data: studentRecord } = await supabase
              .from("students")
              .select("id, full_name, payments(*)")
              .eq("whatsapp_num", cleanPhone)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (studentRecord) {
              if (studentRecord.full_name && !isStaffOrOfficer(studentRecord.full_name)) {
                studentName = studentRecord.full_name.trim();
                setUserProfile((prev) => ({ ...prev, name: studentName }));
              }

              if (studentRecord.payments && Array.isArray(studentRecord.payments) && studentRecord.payments.length > 0) {
                const approved = studentRecord.payments.find((p: any) => {
                  const s = (p.status || "").toUpperCase();
                  return s === "APPROVED" || s === "VERIFIED" || s === "ACTIVE";
                });

                if (approved) {
                  isVerified = true;
                  activePayment = approved;
                  localStorage.setItem("hanoon_local_payments", JSON.stringify(studentRecord.payments));
                } else {
                  const pendingPay = studentRecord.payments.find((p: any) => {
                    const s = (p.status || "").toUpperCase();
                    return s === "PENDING" || s === "PENDING_VERIFICATION";
                  });
                  if (pendingPay) {
                    isPending = true;
                    activePayment = pendingPay;
                  } else {
                    activePayment = studentRecord.payments[0];
                  }
                }
              }
            }
          }

          // 2. Also check payments table directly by transaction ID or payment ID
          if (!isVerified && (cleanTxId || pendingPaymentId)) {
            const queryTarget = cleanTxId || pendingPaymentId;
            const { data: payRecords } = await supabase
              .from("payments")
              .select("id, status, amount, course_id, submitted_at, upi_txid, rejection_reason")
              .or(`upi_txid.eq.${queryTarget},id.eq.${queryTarget}`)
              .order("created_at", { ascending: false })
              .limit(1);

            if (payRecords && payRecords.length > 0) {
              const pay = payRecords[0];
              const s = (pay.status || "").toUpperCase();
              if (s === "APPROVED" || s === "VERIFIED" || s === "ACTIVE") {
                isVerified = true;
                activePayment = pay;
              } else if (s === "PENDING" || s === "PENDING_VERIFICATION") {
                isPending = true;
                activePayment = pay;
              }
            }
          }
        }
      } catch (err) {
        console.warn("Supabase verification check warning:", err);
      }

      // 3. Fallback: Check local storage cache if network or Supabase query had issues
      if (!isVerified && !isPending && typeof window !== "undefined") {
        try {
          const savedPaymentsRaw = localStorage.getItem("hanoon_local_payments");
          if (savedPaymentsRaw) {
            const payments = JSON.parse(savedPaymentsRaw);
            if (Array.isArray(payments) && payments.length > 0) {
              const userMatch = payments.find((p: any) => {
                const matchPhone = (p.student?.whatsapp_num || "").replace(/\D/g, "");
                return (
                  (cleanPhone && matchPhone === cleanPhone) ||
                  (cleanTxId && (p.upi_txid === cleanTxId || p.id === cleanTxId))
                );
              });
              if (userMatch) {
                const s = (userMatch.status || "").toUpperCase();
                if (s === "APPROVED" || s === "VERIFIED" || s === "ACTIVE") {
                  isVerified = true;
                  activePayment = userMatch;
                } else if (s === "PENDING" || s === "PENDING_VERIFICATION") {
                  isPending = true;
                  activePayment = userMatch;
                }
              }
            }
          }
        } catch {}
      }

      if (!isMounted) return;

      // 4. Resolve Enrolled Course dynamically from user's payment record
      if (activePayment && activePayment.course_id) {
        const matchedCourse = SHOWCASE_COURSES.find(
          (c) =>
            c.id === activePayment.course_id ||
            c.id.toLowerCase() === (activePayment.course_id || "").toLowerCase() ||
            (activePayment.course_id === "shamail" && c.id.includes("shamail")) ||
            (activePayment.course_id.includes("shamail") && c.id.includes("shamail"))
        );
        if (matchedCourse) {
          setSelectedCourse(matchedCourse);
        }
      }

      // 5. Update student payment status in state
      if (isVerified && activePayment) {
        setPaymentDetails({
          upiTxId: activePayment.upi_txid || cleanTxId || "VERIFIED",
          amount: typeof activePayment.amount === "number" ? `₹${activePayment.amount}` : activePayment.amount || "₹3000",
          submittedAt: activePayment.submitted_at || new Date().toLocaleTimeString(),
          status: "verified",
        });
        if (typeof window !== "undefined") {
          localStorage.removeItem("hanoon_pending_payment");
          localStorage.setItem("hanoon_student_enrolled", "true");
        }
        // IF the status is 'APPROVED' or 'VERIFIED': transition out of Pending screen and into active Dashboard
        setCurrentScreen((prev) => (prev === "pending-verification" ? "dashboard" : prev));
      } else if (isPending && activePayment) {
        setPaymentDetails({
          upiTxId: activePayment.upi_txid || cleanTxId,
          amount: typeof activePayment.amount === "number" ? `₹${activePayment.amount}` : activePayment.amount || SHOWCASE_COURSES[0].fee,
          submittedAt: activePayment.submitted_at || new Date().toLocaleTimeString(),
          status: "pending_verification",
        });
        if (typeof window !== "undefined") {
          localStorage.removeItem("hanoon_student_enrolled");
        }
        // IF the status is 'PENDING': redirect to the Pending Verification screen
        setCurrentScreen((prev) => (prev === "dashboard" ? "pending-verification" : prev));
      }
    };

    verifyAndRoute();

    return () => {
      isMounted = false;
    };
  }, [initialUser]);

  // Purge global React state upon user logout
  useEffect(() => {
    const handleLogout = () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("hanoon_pending_payment");
        localStorage.removeItem("hanoon_student_enrolled");
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
              const newSt = (updated?.status || "").toUpperCase();
              if (
                updated &&
                (newSt === "APPROVED" || newSt === "VERIFIED" || newSt === "ACTIVE")
              ) {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("hanoon_pending_payment");
                  localStorage.setItem("hanoon_student_enrolled", "true");
                }
                if (updated.course_id) {
                  const matchedCourse = SHOWCASE_COURSES.find(
                    (c) =>
                      c.id === updated.course_id ||
                      c.id.toLowerCase() === (updated.course_id || "").toLowerCase() ||
                      (updated.course_id === "shamail" && c.id.includes("shamail")) ||
                      (updated.course_id.includes("shamail") && c.id.includes("shamail"))
                  );
                  if (matchedCourse) {
                    setSelectedCourse(matchedCourse);
                  }
                }
                setPaymentDetails((prev) => ({
                  ...prev,
                  upiTxId: updated.upi_txid || prev.upiTxId || "VERIFIED",
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
        const { status, upi_txid, course_id } = customEvt.detail;
        const st = (status || "").toUpperCase();
        if (st === "APPROVED" || st === "VERIFIED" || st === "ACTIVE") {
          if (typeof window !== "undefined") {
            localStorage.removeItem("hanoon_pending_payment");
            localStorage.setItem("hanoon_student_enrolled", "true");
          }
          if (course_id) {
            const matchedCourse = SHOWCASE_COURSES.find(
              (c) =>
                c.id === course_id ||
                c.id.toLowerCase() === (course_id || "").toLowerCase() ||
                (course_id === "shamail" && c.id.includes("shamail")) ||
                (course_id.includes("shamail") && c.id.includes("shamail"))
            );
            if (matchedCourse) {
              setSelectedCourse(matchedCourse);
            }
          }
          setPaymentDetails((prev) => ({
            ...prev,
            upiTxId: upi_txid || prev.upiTxId || "VERIFIED",
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

  // Step 3 -> Step 4: UPI Payment (Directly proceed since details were provided in Step 2)
  const handleProceedToRegister = () => {
    // If student details have not been provided yet, route to Screen 2 (Onboarding)
    if (!userProfile.name || !userProfile.phone) {
      setCurrentScreen("onboarding");
      return;
    }

    // Step 4 (UPI Payment): Student already provided details in Step 2.
    // Take them directly to the UPI Payment screen!
    setPaymentDetails((prev) => ({
      ...prev,
      upiTxId: "",
      amount: selectedCourse.admissionFee || selectedCourse.fee,
      submittedAt: "",
      status: "unpaid",
    }));
    setCurrentScreen("payment");
  };

  const handleSaveProfile = async (profile: UserProfile) => {
    setUserProfile(profile);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hanoon_student_profile", JSON.stringify(profile));
      } catch {}
    }
    if (profile.name && profile.phone) {
      try {
        await saveStudentLead({
          fullName: profile.name,
          whatsappNum: profile.phone,
          district: profile.place || "Kerala",
        });
      } catch (e) {
        console.warn("saveStudentLead async warning:", e);
      }
    }
  };

  const handleSaveProfileAndProceed = async (profile?: UserProfile) => {
    if (profile) {
      await handleSaveProfile(profile);
    }
    // Screen 2 (Student Details): After submitting the form, route user directly to the Course Catalog (Screen 3)
    setCurrentScreen("courses");
  };

  // Step 4 -> Step 5
  const handleProceedToPayment = () => {
    setCurrentScreen("payment");
  };

  // Step 4 -> Step 5: Advance to Verification Submitted ("Payment Under Review")
  const handleSubmitPayment = (txId: string, paymentId?: string, screenshotUrl?: string) => {
    const updatedDetails: PaymentDetails = {
      upiTxId: txId,
      amount: selectedCourse.admissionFee || selectedCourse.fee,
      submittedAt: new Date().toLocaleTimeString(),
      status: "pending_verification",
      screenshotUrl,
    };
    setPaymentDetails(updatedDetails);

    // Save pending payment record locally to guarantee persistence across browser refreshes
    if (typeof window !== "undefined") {
      const pendingRecord = {
        txId,
        paymentId,
        screenshotUrl,
        courseId: selectedCourse.id,
        courseTitle: selectedCourse.title,
        amount: selectedCourse.admissionFee || selectedCourse.fee,
        submittedAt: new Date().toLocaleTimeString(),
        studentName: userProfile.name,
        studentPhone: userProfile.phone,
        status: "PENDING",
      };
      localStorage.setItem("hanoon_pending_payment", JSON.stringify(pendingRecord));
    }

    // Advance directly to Screen 5: Dedicated "Payment Under Review" state (DO NOT kick out to homepage)
    setCurrentScreen("pending-verification");
  };

  const handleBack = () => {
    if (currentScreen === "dashboard") setCurrentScreen("courses");
    else if (currentScreen === "pending-verification") setCurrentScreen("courses");
    else if (currentScreen === "payment") setCurrentScreen("course-details");
    else if (currentScreen === "onboarding") setCurrentScreen("course-details");
    else if (currentScreen === "course-details") setCurrentScreen("courses");
    else if (currentScreen === "courses") setCurrentScreen("splash");
  };

  const canGoBack = currentScreen !== "splash";
  const isEnrolled =
    (paymentDetails.status || "").toUpperCase() === "APPROVED" ||
    (paymentDetails.status || "").toUpperCase() === "VERIFIED" ||
    (paymentDetails.status || "").toUpperCase() === "ACTIVE" ||
    paymentDetails.status === "verified";
  const hasPaymentSubmitted =
    !isEnrolled &&
    ((paymentDetails.status || "").toUpperCase() === "PENDING" ||
      paymentDetails.status === "pending_verification" ||
      currentScreen === "pending-verification" ||
      Boolean(paymentDetails.upiTxId && paymentDetails.upiTxId !== "VERIFIED"));

  // Route Guard: Restrict Dashboard access strictly to APPROVED / ACTIVE students
  useEffect(() => {
    if (currentScreen === "dashboard" && !isEnrolled) {
      if (hasPaymentSubmitted || paymentDetails.status === "pending_verification") {
        setCurrentScreen("pending-verification");
      } else {
        setAccessNotice("Please complete enrollment to access your dashboard.");
        setCurrentScreen("course-details");
      }
    } else if (currentScreen === "pending-verification" && isEnrolled) {
      // IF the status is 'APPROVED' or 'VERIFIED': Completely hide the verification screen.
      // Render the actual Student Dashboard showing their selected/enrolled course.
      setCurrentScreen("dashboard");
    }
  }, [currentScreen, isEnrolled, hasPaymentSubmitted, paymentDetails.status]);

  const handleSelectScreen = (screen: ScreenTab) => {
    if (screen === "payment") {
      const hasStudentDetails = Boolean(userProfile.name?.trim() && userProfile.phone?.trim());
      if (!hasStudentDetails) {
        setCurrentScreen("onboarding");
        return;
      }
    }
    if (screen === "dashboard" && !isEnrolled) {
      if (hasPaymentSubmitted) {
        setCurrentScreen("pending-verification");
        return;
      }
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
          isPending={hasPaymentSubmitted}
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
          {/* Screen 1 (Landing Page): Clicking "Get Started" MUST open the Student Details form */}
          {currentScreen === "splash" && (
            <ScreenSplash
              onExploreCourses={() => setCurrentScreen("onboarding")}
              onGetStarted={() => setCurrentScreen("onboarding")}
            />
          )}

          {/* Screen 2 (Student Details): After submitting form, route directly to Course Catalog */}
          {currentScreen === "onboarding" && (
            <ScreenOnboarding
              userProfile={userProfile}
              selectedCourse={selectedCourse}
              onSaveProfile={handleSaveProfile}
              onProceedToCourses={handleSaveProfileAndProceed}
              onBackToHome={() => setCurrentScreen("splash")}
            />
          )}

          {/* Screen 3: Course Catalog / Selection View */}
          {currentScreen === "courses" && (
            <ScreenCoursesList onSelectCourse={handleSelectCourse} />
          )}

          {/* Screen 3 (Detail): Course Details & Pricing Sheet */}
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

          {/* Screen 4: Manual UPI Payment Screen */}
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

          {/* Screen 5: Pending Verification ("Payment Under Review" state) */}
          {currentScreen === "pending-verification" && (
            <ScreenPendingVerification
              userProfile={userProfile}
              selectedCourse={selectedCourse}
              paymentDetails={paymentDetails}
              onGoToCourses={() => setCurrentScreen("courses")}
              onGoToDashboard={() => handleSelectScreen("dashboard")}
              onReuploadPayment={() => setCurrentScreen("payment")}
            />
          )}

          {/* Gated Post-Enrollment: Student Dashboard (Strictly gated for APPROVED/ACTIVE students) */}
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

      {/* Student Registration Modal / Popup */}
      <StudentRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        selectedCourseId={selectedCourse.id}
        onSubmit={(profile, courseId) => {
          handleSaveProfile(profile);
          setIsRegisterModalOpen(false);

          if (currentScreen === "splash") {
            setCurrentScreen("courses");
            return;
          }

          const matchedCourse = SHOWCASE_COURSES.find(
            (c) => c.id === courseId || (courseId === "shamail" && c.id.includes("shamail"))
          );
          if (matchedCourse) {
            setSelectedCourse(matchedCourse);
          }

          // Transition to Screen 4 (UPI Payment): status is unpaid so QR code & TxID input is shown
          setPaymentDetails({
            upiTxId: "",
            amount: matchedCourse?.admissionFee || matchedCourse?.fee || selectedCourse.admissionFee || selectedCourse.fee,
            submittedAt: "",
            status: "unpaid",
          });

          setCurrentScreen("payment");
        }}
        initialProfile={userProfile}
      />

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
