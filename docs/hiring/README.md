# ClickFlash Hiring & Team Composition Toolkit

> **Operational Status:** ACTIVE & EXECUTING  
> **Target Horizon:** Horizon 1 ("First Revenue", Months 1–6) $\rightarrow$ Horizon 2 Staging  
> **Core Architecture Reference:** [`docs/ADR/012-hardened-hybrid-appliance.md`](file:///c:/Users/alamo/Desktop/ClickFlash/docs/ADR/012-hardened-hybrid-appliance.md)  
> **Strategic Analysis:** [`team_composition_analysis.md`](file:///C:/Users/alamo/.gemini/antigravity/brain/decccea0-51c4-49ba-b673-db73a1223c86/team_composition_analysis.md)

---

## 1. Executive Strategy & Founder Directives

- **[Founder Hiring Decisions & Mandate](./FOUNDER_DECISIONS.md)**: Ratified resolutions for the 6 strategic open questions (funding bridge, regional clustering, hire sequencing, and equity allocation).
- **[Candidate Pipeline & ATS Tracker](./PIPELINE.md)**: Live candidate pipeline, interview stage gates, and turnaround SLAs.
- **[30-60-90 Day Onboarding Playbook](./ONBOARDING_PLAYBOOK.md)**: Day 1 machine setup, green build verification, and 30-day autonomous contribution roadmap.
- **[Outreach & Sourcing Templates](./OUTREACH_TEMPLATES.md)**: High-converting outbound copy for GitHub, LinkedIn, and developer communities.

---

## 2. Active Horizon 1 Job Descriptions & Interview Rubrics

| Role | Priority | Status | Job Description | Technical Interview Rubric |
|:---|:---|:---|:---|:---|
| **Field Deployment & Systems Engineer** | 🔴 P0 | Active Sourcing | [Job Description](./JD_Field_Systems_Engineer.md) | [Interview Rubric & Practical Challenge](./rubrics/RUBRIC_Field_Systems_Engineer.md) |
| **Senior Full-Stack Engineer** | 🔴 P0 | Active Sourcing | [Job Description](./JD_Senior_Full_Stack.md) | [Interview Rubric & Practical Challenge](./rubrics/RUBRIC_Senior_Full_Stack.md) |
| **Mobile Engineer (Expo / Rust)** | 🟡 P1 | Pipeline Staged | [Job Description](./JD_Mobile_Engineer.md) | [Interview Rubric & Practical Challenge](./rubrics/RUBRIC_Mobile_Engineer.md) |
| **Sales & Partnerships Lead** | 🟡 P1 | Pipeline Staged | [Job Description](./JD_Sales_Lead.md) | [Interview Rubric & Role-Play Simulation](./rubrics/RUBRIC_Sales_Lead.md) |

---

## 3. Horizon 2 Staged Roles (Months 6–12)

| Role | Priority | Status | Description |
|:---|:---|:---|:---|
| **Computer Vision / ML Engineer** | 🔴 P0 | Staged | [Job Description](./JD_CV_ML_Engineer.md) — Owns ArcFace 512D, ONNX quantization, and Real-ESRGAN on edge hardware. |
| **Customer Success & Field Ops Manager** | 🔴 P0 | Staged | [Job Description](./JD_Customer_Success_Manager.md) — Oversees venue onboarding, photographer training, and guest retention. |

---

## 4. Compensation & Equity Philosophy

- **Base Compensation:** 75th percentile of startup market with regional cost-of-living adjustments.
- **Equity:** Top-of-market pre-seed equity ($0.5\% - 1.5\%$ per key hire), vesting over 4 years with a 1-year cliff.
- **Verification Rule for All Technical Hires:** All technical candidates must successfully run the monorepo verification suite (`npm run typecheck:all` and test suites) as part of their evaluation.
