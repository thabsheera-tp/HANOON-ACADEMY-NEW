"use client";

import React, { useState, useEffect } from "react";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import ScreenSplash from "@/components/mobile/ScreenSplash";
import ScreenCoursesList, { SHOWCASE_COURSES } from "@/components/mobile/ScreenCoursesList";
import ScreenCourseDetails from "@/components/mobile/ScreenCourseDetails";
import ScreenOnboarding from "@/components/mobile/ScreenOnboarding";
import ScreenPayment from "@/components/mobile/ScreenPayment";
import ScreenDashboard from "@/components/mobile/ScreenDashboard";
import ReceiptModal from "@/components/mobile/ReceiptModal";
import AdminManagementPanel from "@/components/mobile/AdminManagementPanel";
import { UserProfile, SelectedCourse, PaymentDetails, ScreenTab } from "@/types/app";
import { getCurrentSession, setAuthSession, UserProfileRecord } from "@/services/authService";

interface MobileAppShellProps {
  initialUser?: UserProfileRecord | null;
}

export default function MobileAppShell({ initialUser }: MobileAppShellProps = {}) {
  // 6-Step Workflow:
  // Step 1: "splash" -> Welcome Screen
  // Step 2: "courses" -> Course Selection View
  // Step 3: "course-details" -> Course Details & Pricing Sheet
  // Step 4: "onboarding" -> Student Onboarding Form
  // Step 5: "payment" -> Manual UPI Payment Screen
  // Step 6: "dashboard" -> Student Dashboard & Profile View
  const [currentScreen, setCurrentScreen] = useState<ScreenTab>("splash");

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
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Student Session Persistence & Auto-Restoration
  useEffect(() => {
    const session = getCurrentSession();
    const activeUser = initialUser || session?.user;

    if (activeUser) {
      setUserProfile((prev) => ({
        ...prev,
        name: activeUser.full_name || prev.name,
        place: activeUser.district || prev.place,
        phone: activeUser.whatsapp_num || prev.phone,
      }));

      // Check if student has a saved payment in localStorage
      try {
        const savedPaymentsRaw = localStorage.getItem("hanoon_local_payments");
        if (savedPaymentsRaw) {
          const payments = JSON.parse(savedPaymentsRaw);
          if (Array.isArray(payments) && payments.length > 0) {
            const latest = payments[0];
            setPaymentDetails({
              upiTxId: latest.upi_txid,
              amount: `₹${latest.amount}`,
              submittedAt: latest.submitted_at || new Date().toLocaleTimeString(),
              status: latest.status === "APPROVED" ? "verified" : "pending_verification",
            });
            // Auto-redirect directly to Student Dashboard!
            setCurrentScreen("dashboard");
          }
        }
      } catch (e) {
        console.warn("Could not restore payment session:", e);
      }
    }
  }, [initialUser]);

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

    setCurrentScreen("dashboard");
  };

  const handleSimulateAdminApproval = () => {
    setPaymentDetails((prev) => ({
      ...prev,
      status: "verified",
    }));
    setCurrentScreen("dashboard");
  };

  const handleAdminApproveCallback = (approvedStudentName?: string) => {
    setPaymentDetails((prev) => ({
      ...prev,
      status: "verified",
    }));
    if (approvedStudentName && !userProfile.name) {
      setUserProfile((prev) => ({ ...prev, name: approvedStudentName }));
    }
  };

  const handleBack = () => {
    if (currentScreen === "dashboard") setCurrentScreen("payment");
    else if (currentScreen === "payment") setCurrentScreen("course-details");
    else if (currentScreen === "onboarding") setCurrentScreen("course-details");
    else if (currentScreen === "course-details") setCurrentScreen("courses");
    else if (currentScreen === "courses") setCurrentScreen("splash");
  };

  const canGoBack = currentScreen !== "splash";
  const isEnrolled = paymentDetails.status === "verified";
  const hasPaymentSubmitted = paymentDetails.status === "pending_verification";

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
        />

        {/* Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto flex flex-col relative z-10 bg-white">
          {/* Step 1: Welcome Screen */}
          {currentScreen === "splash" && (
            <ScreenSplash
              onEnterPortal={handleExploreCourses}
              onExploreCourses={handleExploreCourses}
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
              onGoToDashboard={() => setCurrentScreen("dashboard")}
              onSimulateAdminApproval={handleSimulateAdminApproval}
              onOpenReceipt={() => setIsReceiptOpen(true)}
              onSaveProfile={handleSaveProfile}
            />
          )}

          {/* Step 6: Student Dashboard & Profile View */}
          {currentScreen === "dashboard" && (
            <ScreenDashboard
              userProfile={userProfile}
              selectedCourse={selectedCourse}
              paymentDetails={paymentDetails}
              onChangeCourse={() => setCurrentScreen("courses")}
              onOpenReceipt={() => setIsReceiptOpen(true)}
              onOpenAdminPanel={() => setIsAdminOpen(true)}
              onSimulateAdminApproval={handleSimulateAdminApproval}
            />
          )}
        </div>

        {/* Sticky Mobile Bottom Navigation (Visible on Screens 2 to 6) */}
        <MobileBottomNav
          currentScreen={currentScreen}
          onChangeScreen={(screen) => setCurrentScreen(screen)}
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

      {/* Real-Time Admin Management Desk Modal */}
      <AdminManagementPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onPaymentApproved={handleAdminApproveCallback}
      />
    </div>
  );
}
