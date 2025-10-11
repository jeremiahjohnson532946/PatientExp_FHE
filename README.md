# PatientExp_FHE

A privacy-first platform for collecting anonymous Patient Reported Experience Measures (PREMs) using Fully Homomorphic Encryption (FHE). Patients can submit encrypted feedback about their healthcare experiences, while hospitals can only access aggregated statistics derived via FHE, ensuring individual responses remain private.

## Project Background

Patient experience feedback is crucial for improving healthcare services. Traditional methods face the following challenges:

• Privacy concerns: Patients may hesitate to share honest feedback due to identity exposure.
• Data fragmentation: Feedback across departments is often siloed, reducing actionable insights.
• Manual aggregation: Hospitals may spend significant time processing PREMs.
• Limited transparency: Patients cannot verify whether their feedback contributes to improvements.

PatientExp_FHE addresses these challenges by:

• Encrypting all PREMs on the client-side before submission.
• Aggregating statistics using FHE without exposing individual responses.
• Providing hospitals with real-time, privacy-preserving insights.
• Maintaining trust and compliance with privacy regulations.

## Features

### Core Functionality

• Encrypted PREMs Submission: Patients submit encrypted questionnaires regarding their healthcare experiences.
• Real-time Aggregated Dashboard: Hospitals can view up-to-date statistics without seeing individual responses.
• Multi-Department Insights: Aggregation supports cross-department comparisons while maintaining anonymity.
• Patient-Centric Metrics: Identify areas needing improvement based on aggregated trends.

### Privacy & Security

• Client-side Encryption: PREMs are encrypted on the patient's device before submission.
• FHE Aggregation: Hospitals receive only aggregated insights without accessing raw data.
• Anonymity by Design: No personally identifiable information is stored or linked to submissions.
• Immutable Records: Feedback cannot be altered or deleted once submitted.

## Architecture

### Backend Services

• Secure API: Accepts encrypted PREMs and forwards them for FHE aggregation.
• FHE Aggregation Engine: Computes aggregated statistics while keeping individual data encrypted.
• Database: Stores encrypted PREMs and aggregated results.

### Frontend Application

• React + TypeScript: Interactive dashboard for hospital staff.
• Data Visualization: Graphs and charts display aggregated PREMs insights.
• Secure Submission Form: Patients submit PREMs securely with client-side encryption.

## Technology Stack

### Backend

• Node.js 18+: Server-side runtime.
• FHE Library: Performs encrypted computation on PREMs data.
• PostgreSQL: Stores encrypted PREMs and aggregation metadata.

### Frontend

• React 18 + TypeScript: Responsive and modern interface.
• Charting Library: Displays aggregated patient experience metrics.
• Tailwind + CSS: Styling and layout.

## Installation

### Prerequisites

• Node.js 18+
• npm / yarn / pnpm package manager

### Setup

1. Clone the repository.
2. Install dependencies.
3. Configure environment variables for database and FHE engine.
4. Start backend and frontend servers.

## Usage

• Patients: Complete PREMs questionnaire on the secure frontend.
• Hospitals: View aggregated statistics and trends via the dashboard.
• Administrators: Monitor system performance and FHE aggregation results.

## Security Features

• Fully Encrypted Submission: PREMs remain encrypted at all stages.
• Immutable Storage: Feedback cannot be modified post-submission.
• Aggregated Analytics Only: Raw data never revealed to hospitals.
• Privacy Compliance: Supports regulations around patient data protection.

## Future Enhancements

• Advanced FHE Computation: Support for more complex analytics on encrypted PREMs.
• AI-Driven Insights: Identify patterns and predict areas for service improvement.
• Multi-Hospital Aggregation: Combine statistics across institutions securely.
• Mobile-Friendly Interface: Extend PREMs submission and dashboard to mobile devices.
• Patient Feedback History: Allow patients to track their own submissions anonymously.

Built with ❤️ to enhance patient-centric healthcare while preserving privacy.
