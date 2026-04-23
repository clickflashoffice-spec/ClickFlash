import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Chip,
  Grid,
  Alert,
  CircularProgress,
} from "@mui/material";
import { logger } from "../utils/logger";
import { emailService } from "../services/emailService";

interface Campaign {
  id?: string;
  name: string;
  type: "post-event" | "abandoned-cart" | "re-engagement";
  triggerEvent: string;
  delayMinutes: number;
  subjectTemplate: string;
  bodyHtml: string;
  bodyText: string;
  isActive: boolean;
}

interface CampaignEditorProps {
  campaign: Campaign | null;
  open: boolean;
  onClose: () => void;
  onSave: (campaign: Campaign) => void;
}

const AVAILABLE_VARIABLES = [
  { key: "customer_name", label: "Customer Name" },
  { key: "event_name", label: "Event Name" },
  { key: "gallery_link", label: "Gallery Link" },
  { key: "photo_count", label: "Photo Count" },
  { key: "cart_total", label: "Cart Total" },
  { key: "cart_link", label: "Cart Link" },
  { key: "discount_code", label: "Discount Code" },
];

const DELAY_OPTIONS = [
  { value: 60, label: "1 hour" },
  { value: 360, label: "6 hours" },
  { value: 1440, label: "24 hours" },
  { value: 2880, label: "2 days" },
  { value: 4320, label: "3 days" },
  { value: 10080, label: "7 days" },
  { value: 43200, label: "30 days" },
];

/**
 * Campaign Editor
 *
 * Modal form for creating and editing email campaigns.
 * Includes template editor with variable chips and preview.
 */
export const CampaignEditor: React.FC<CampaignEditorProps> = ({
  campaign,
  open,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Campaign>({
    name: "",
    type: "post-event",
    triggerEvent: "album_published",
    delayMinutes: 60,
    subjectTemplate: "",
    bodyHtml: "",
    bodyText: "",
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (campaign) {
      setFormData(campaign);
    } else {
      // Reset form for new campaign
      setFormData({
        name: "",
        type: "post-event",
        triggerEvent: "album_published",
        delayMinutes: 60,
        subjectTemplate: "",
        bodyHtml: "",
        bodyText: "",
        isActive: true,
      });
    }
  }, [campaign, open]);

  const handleChange = (field: keyof Campaign, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const insertVariable = (variable: string) => {
    const cursorField = "bodyHtml"; // TODO: Track which field has focus
    setFormData((prev) => ({
      ...prev,
      [cursorField]: prev[cursorField] + ` {${variable}}`,
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Campaign name is required";
    }
    if (!formData.subjectTemplate.trim()) {
      newErrors.subjectTemplate = "Subject line is required";
    }
    if (!formData.bodyHtml.trim()) {
      newErrors.bodyHtml = "Email body is required";
    }
    if (!formData.bodyText.trim()) {
      newErrors.bodyText = "Plain text version is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    logger.info("[CampaignEditor] Saving campaign", formData);
    onSave(formData);
    onClose();
  };

  // Test email state
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleTestSend = async () => {
    // Open dialog to enter test email address
    setTestEmailDialogOpen(true);
    setTestSendResult(null);
  };

  const handleConfirmTestSend = async () => {
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      setTestSendResult({
        success: false,
        message: "Please enter a valid email address",
      });
      return;
    }

    setIsSendingTest(true);
    setTestSendResult(null);

    try {
      // Render templates with sample variables
      const sampleVariables: Record<string, string> = {
        customer_name: "John Doe",
        event_name: "Sample Event",
        gallery_link: "https://clickflash.com/gallery/sample",
        photo_count: "42",
        cart_total: "$150.00",
        cart_link: "https://clickflash.com/cart/sample",
        discount_code: "SAMPLE20",
      };

      const subject = emailService.renderTemplate(
        formData.subjectTemplate,
        sampleVariables,
      );
      const html = emailService.renderTemplate(
        formData.bodyHtml,
        sampleVariables,
      );
      const text = emailService.renderTemplate(
        formData.bodyText,
        sampleVariables,
      );

      const success = await emailService.sendTestEmail(
        testEmailAddress,
        subject,
        html,
        text,
      );

      if (success) {
        setTestSendResult({
          success: true,
          message: `Test email sent successfully to ${testEmailAddress}`,
        });
        logger.info("[CampaignEditor] Test email sent", {
          to: testEmailAddress,
          campaign: formData.name,
        });
      } else {
        setTestSendResult({
          success: false,
          message:
            "Failed to send test email. Please check your email configuration.",
        });
        logger.error("[CampaignEditor] Test email failed");
      }
    } catch (error) {
      setTestSendResult({
        success: false,
        message: "An error occurred while sending the test email.",
      });
      logger.error("[CampaignEditor] Test email error", error);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {campaign ? "Edit Campaign" : "Create New Campaign"}
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Campaign Name */}
            <TextField
              label="Campaign Name"
              fullWidth
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              sx={{ mb: 2 }}
            />

            {/* Type and Delay */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
                mb: 2,
              }}
            >
              <FormControl fullWidth>
                <InputLabel>Campaign Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Campaign Type"
                  onChange={(e) => handleChange("type", e.target.value)}
                >
                  <MenuItem value="post-event">Post-Event</MenuItem>
                  <MenuItem value="abandoned-cart">Abandoned Cart</MenuItem>
                  <MenuItem value="re-engagement">Re-Engagement</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Send After</InputLabel>
                <Select
                  value={formData.delayMinutes}
                  label="Send After"
                  onChange={(e) => handleChange("delayMinutes", e.target.value)}
                >
                  {DELAY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Variable Chips */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ mb: 1, display: "block" }}
              >
                Click to insert variables:
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {AVAILABLE_VARIABLES.map((variable) => (
                  <Chip
                    key={variable.key}
                    label={`{${variable.key}}`}
                    size="small"
                    onClick={() => insertVariable(variable.key)}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
              </Box>
            </Box>

            {/* Subject Line */}
            <TextField
              label="Subject Line"
              fullWidth
              value={formData.subjectTemplate}
              onChange={(e) => handleChange("subjectTemplate", e.target.value)}
              error={!!errors.subjectTemplate}
              helperText={errors.subjectTemplate}
              placeholder="Your photos are ready! 🎉"
              sx={{ mb: 2 }}
            />

            {/* Email Body (HTML) */}
            <TextField
              label="Email Body (HTML)"
              fullWidth
              multiline
              rows={10}
              value={formData.bodyHtml}
              onChange={(e) => handleChange("bodyHtml", e.target.value)}
              error={!!errors.bodyHtml}
              helperText={errors.bodyHtml}
              placeholder="<h1>Hi {customer_name}!</h1><p>Your photos are ready.</p>"
              sx={{ mb: 2, fontFamily: "monospace" }}
            />

            {/* Email Body (Plain Text) */}
            <TextField
              label="Plain Text Version"
              fullWidth
              multiline
              rows={6}
              value={formData.bodyText}
              onChange={(e) => handleChange("bodyText", e.target.value)}
              error={!!errors.bodyText}
              helperText={errors.bodyText}
              placeholder="Hi {customer_name}! Your photos are ready."
              sx={{ mb: 2, fontFamily: "monospace" }}
            />

            {/* Info Alert */}
            <Alert severity="info" sx={{ mt: 2 }}>
              Use curly braces to insert variables (e.g., {"{customer_name}"}).
              Unsubscribe links will be added automatically.
            </Alert>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleTestSend} color="secondary">
            Send Test Email
          </Button>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save Campaign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog
        open={testEmailDialogOpen}
        onClose={() => setTestEmailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Send Test Email</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter an email address to receive a test version of this campaign
              with sample data.
            </Typography>
            <TextField
              label="Test Email Address"
              type="email"
              fullWidth
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              placeholder="your@email.com"
              disabled={isSendingTest}
              sx={{ mb: 2 }}
            />
            {testSendResult && (
              <Alert
                severity={testSendResult.success ? "success" : "error"}
                sx={{ mt: 1 }}
              >
                {testSendResult.message}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setTestEmailDialogOpen(false)}
            disabled={isSendingTest}
          >
            Close
          </Button>
          <Button
            onClick={handleConfirmTestSend}
            variant="contained"
            disabled={isSendingTest || !testEmailAddress}
            startIcon={isSendingTest ? <CircularProgress size={16} /> : null}
          >
            {isSendingTest ? "Sending..." : "Send Test"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
