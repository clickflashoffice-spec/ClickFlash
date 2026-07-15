"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { submitContactForm } from "@/lib/api";

interface FormData {
  name: string;
  email: string;
  service: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  service?: string;
  message?: string;
}

export function ContactSection() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    service: "Ecosystem Demo",
    message: ""
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (formData.message.length < 10) {
      newErrors.message = "Message must be at least 10 characters";
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
      const data = await submitContactForm(formData);

      setSubmitStatus("success");
      setSubmitMessage(data.message || "Thank you for your message! We will get back to you soon.");
      setFormData({ name: "", email: "", service: "Ecosystem Demo", message: "" });
    } catch (error: unknown) {
      const err = error as Error;
      setSubmitStatus("error");
      setSubmitMessage(err.message || "Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <section id="contact" className="py-16 md:py-24 lg:py-32 bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Let's Build Your Vision"
          subtitle="Contact Us"
          light={true}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 max-w-6xl mx-auto">
          {/* Info */}
          <div>
            <h3 className="text-2xl md:text-3xl font-serif font-medium text-slate-900 mb-6 md:mb-8">Get in Touch</h3>
            <p className="text-slate-600 mb-12 leading-relaxed">
              Whether you&apos;re a luxury wedding photographer or a high-volume event agency,
              our ecosystem is built to handle your scale. Contact our sales team for
              a private demo of the ClickFlash protocol.
            </p>

            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-cyan-700/10 border border-cyan-500/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-cyan-700" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">Email</p>
                  <p className="text-slate-700">office@clickflash.photography</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-cyan-700/10 border border-cyan-500/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-cyan-700" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">Office</p>
                  <p className="text-slate-700">+1 (555) CLICK-FLASH</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-cyan-700/10 border border-cyan-500/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-cyan-700" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">HQ</p>
                  <p className="text-slate-700">Antigravity Mission Control, Earth</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <GlassPanel className="p-6 md:p-10">
            <AnimatePresence mode="wait">
              {submitStatus === "success" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                  <h3 className="text-2xl font-serif text-slate-900 mb-2">Message Sent!</h3>
                  <p className="text-slate-600">{submitMessage}</p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => setSubmitStatus("idle")}
                  >
                    Send Another Message
                  </Button>
                </motion.div>
              ) : (
                <motion.form
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Full Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        className={`w-full bg-white border rounded-lg px-4 py-3 text-slate-900 focus:border-cyan-500 outline-none transition-colors ${errors.name ? "border-red-500" : "border-slate-200"
                          }`}
                        placeholder="John Doe"
                      />
                      {errors.name && (
                        <p className="text-red-500 text-xs">{errors.name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Business Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className={`w-full bg-white border rounded-lg px-4 py-3 text-slate-900 focus:border-cyan-500 outline-none transition-colors ${errors.email ? "border-red-500" : "border-slate-200"
                          }`}
                        placeholder="john@example.com"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-xs">{errors.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Service Interest</label>
                    <select
                      value={formData.service}
                      onChange={(e) => handleChange("service", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:border-cyan-500 outline-none transition-colors appearance-none"
                    >
                      <option className="bg-white">Ecosystem Demo</option>
                      <option className="bg-white">Luxury Wedding Photography</option>
                      <option className="bg-white">High-Volume Events</option>
                      <option className="bg-white">Custom Implementation</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Message</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => handleChange("message", e.target.value)}
                      className={`w-full bg-white border rounded-lg px-4 py-3 text-slate-900 focus:border-cyan-500 outline-none transition-colors min-h-[150px] ${errors.message ? "border-red-500" : "border-slate-200"
                        }`}
                      placeholder="Tell us about your photography scale..."
                    />
                    {errors.message && (
                      <p className="text-red-500 text-xs">{errors.message}</p>
                    )}
                  </div>

                  {submitStatus === "error" && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-red-500 text-sm"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {submitMessage}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Message <Send className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </GlassPanel>
        </div>
      </div>
    </section>
  );
}
