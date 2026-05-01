"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Users, MapPin, DollarSign, CheckCircle, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { submitBooking } from "@/lib/api";

interface BookingFormData {
  name: string;
  email: string;
  phone: string;
  service_type: string;
  event_date: string;
  event_location: string;
  guest_count: string;
  budget_range: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  service_type?: string;
  message?: string;
}

const budgetOptions = [
  { value: "", label: "Select Budget Range" },
  { value: "under-5k", label: "Under $5,000" },
  { value: "5k-10k", label: "$5,000 - $10,000" },
  { value: "10k-25k", label: "$10,000 - $25,000" },
  { value: "25k-50k", label: "$25,000 - $50,000" },
  { value: "50k-plus", label: "$50,000+" }
];

const serviceOptions = [
  { value: "", label: "Select Service Type" },
  { value: "wedding", label: "Wedding Photography" },
  { value: "corporate", label: "Corporate Event" },
  { value: "portrait", label: "Portrait Session" },
  { value: "event", label: "Private Event" },
  { value: "commercial", label: "Commercial Photography" }
];

export function BookingSection() {
  const [formData, setFormData] = useState<BookingFormData>({
    name: "",
    email: "",
    phone: "",
    service_type: "",
    event_date: "",
    event_location: "",
    guest_count: "",
    budget_range: "",
    message: ""
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [bookingId, setBookingId] = useState("");

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.service_type) {
      newErrors.service_type = "Please select a service type";
    }

    if (formData.message.length < 10) {
      newErrors.message = "Please provide more details about your event (min 10 characters)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const data = await submitBooking(formData);

      setSubmitStatus("success");
      setSubmitMessage(data.message || "Your booking request has been received!");
      setBookingId(data.booking_id || "");
      setFormData({
        name: "",
        email: "",
        phone: "",
        service_type: "",
        event_date: "",
        event_location: "",
        guest_count: "",
        budget_range: "",
        message: ""
      });
    } catch (error: unknown) {
      const err = error as Error;
      setSubmitStatus("error");
      setSubmitMessage(err.message || "Failed to submit booking request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof BookingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <section id="booking" className="py-32 bg-zinc-950">
      <div className="container mx-auto px-6">
        <SectionHeader
          title="Book Your Session"
          subtitle="Start Your Project"
        />

        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {submitStatus === "success" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-16"
              >
                <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
                <h3 className="text-3xl font-serif text-white mb-4">Booking Request Submitted!</h3>
                {bookingId && (
                  <p className="text-cyan-500 text-lg mb-4">Reference: {bookingId}</p>
                )}
                <p className="text-zinc-400 max-w-md mx-auto mb-8">{submitMessage}</p>
                <Button
                  variant="outline"
                  onClick={() => setSubmitStatus("idle")}
                >
                  Submit Another Request
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <GlassPanel className="p-8 md:p-12">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Personal Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-serif text-white mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-500 text-sm">1</span>
                        Personal Information
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Full Name *</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            className={`w-full bg-white/5 border rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors ${errors.name ? "border-red-500" : "border-white/10"
                              }`}
                            placeholder="John Doe"
                          />
                          {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Email Address *</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange("email", e.target.value)}
                            className={`w-full bg-white/5 border rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors ${errors.email ? "border-red-500" : "border-white/10"
                              }`}
                            placeholder="john@example.com"
                          />
                          {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Phone Number</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    {/* Event Details */}
                    <div className="space-y-6 pt-6 border-t border-white/10">
                      <h3 className="text-lg font-serif text-white mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-500 text-sm">2</span>
                        Event Details
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            Event Date
                          </label>
                          <input
                            type="date"
                            value={formData.event_date}
                            onChange={(e) => handleChange("event_date", e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            Event Location
                          </label>
                          <input
                            type="text"
                            value={formData.event_location}
                            onChange={(e) => handleChange("event_location", e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors"
                            placeholder="City, Venue"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            Guest Count
                          </label>
                          <input
                            type="number"
                            value={formData.guest_count}
                            onChange={(e) => handleChange("guest_count", e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors"
                            placeholder="Approximate number"
                            min="1"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2">
                            <DollarSign className="w-3 h-3" />
                            Budget Range
                          </label>
                          <select
                            value={formData.budget_range}
                            onChange={(e) => handleChange("budget_range", e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors appearance-none"
                          >
                            {budgetOptions.map(option => (
                              <option key={option.value} value={option.value} className="bg-zinc-900">
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Service Selection */}
                    <div className="space-y-6 pt-6 border-t border-white/10">
                      <h3 className="text-lg font-serif text-white mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-500 text-sm">3</span>
                        Service Selection
                      </h3>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Service Type *</label>
                        <select
                          value={formData.service_type}
                          onChange={(e) => handleChange("service_type", e.target.value)}
                          className={`w-full bg-white/5 border rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors appearance-none ${errors.service_type ? "border-red-500" : "border-white/10"
                            }`}
                        >
                          {serviceOptions.map(option => (
                            <option key={option.value} value={option.value} className="bg-zinc-900">
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {errors.service_type && <p className="text-red-500 text-xs">{errors.service_type}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Additional Details *</label>
                        <textarea
                          value={formData.message}
                          onChange={(e) => handleChange("message", e.target.value)}
                          className={`w-full bg-white/5 border rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors min-h-[150px] ${errors.message ? "border-red-500" : "border-white/10"
                            }`}
                          placeholder="Tell us about your vision, specific requirements, or any questions you have..."
                        />
                        {errors.message && <p className="text-red-500 text-xs">{errors.message}</p>}
                      </div>
                    </div>

                    {/* Error Message */}
                    <AnimatePresence>
                      {submitStatus === "error" && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex items-center gap-2 text-red-500 text-sm p-4 bg-red-500/10 rounded-lg"
                        >
                          <AlertCircle className="w-4 h-4" />
                          {submitMessage}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 py-4"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting Request...
                        </>
                      ) : (
                        <>
                          Submit Booking Request
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>

                    <p className="text-center text-zinc-600 text-xs">
                      We typically respond within 24 hours. For urgent inquiries, please call us directly.
                    </p>
                  </form>
                </GlassPanel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}