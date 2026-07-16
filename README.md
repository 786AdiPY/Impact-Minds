<p align="center">
  <img src="assets/banner.png" alt="GLINT Banner" width="100%" />
</p>

<div align="center">

# GLINT

### Predictive Privileged Access Intelligence

Monitor privileged sessions in real time, explain every risk decision, and enforce
policy-driven responses before security incidents escalate.

<p>
  <a href="https://glint-blue.vercel.app">
    <img src="https://img.shields.io/badge/Live-Demo-2563EB?style=for-the-badge&logo=vercel&logoColor=white"/>
  </a>
  <a href="https://drive.google.com/file/d/1w2L1zqdJJ6jwAlUp1MBBb1fvlaYs11N6/view?usp=sharing">
    <img src="https://img.shields.io/badge/Watch-Demo%20Video-EA4335?style=for-the-badge&logo=youtube&logoColor=white"/>
  </a>
</p>

<p>
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white"/>
  <img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white"/>
  <img src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white"/>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white"/>
</p>

</div>

---

## Overview

GLINT is a privileged access management platform focused on **continuous risk evaluation** rather than post-incident investigation.

Instead of waiting until a privileged session violates policy, GLINT evaluates every session as it unfolds. User behavior, access history, command execution, resource sensitivity, and contextual signals are continuously analyzed to determine whether a session should continue, require additional verification, or be terminated.

Risk assessment remains explainable at every stage. Machine learning provides behavioral context, while deterministic security policies retain final authority over access decisions. Every alert, score, and enforcement action can be traced back to the events that produced it.

---

## Problem

Most privileged access solutions answer one question:

**"What happened?"**

Traditional PAM products authenticate users, record sessions, and generate alerts after policy violations occur. They provide visibility but very little prediction.

Security teams still investigate thousands of privileged sessions manually, and insider threats often resemble normal administrator activity until it's too late.

## Solution

GLINT shifts the focus from recording activity to understanding it.

By continuously evaluating behavior during an active session, GLINT can identify abnormal privilege usage early enough for security policies to intervene before damage occurs, combining behavioral analytics with deterministic policy enforcement so every decision stays explainable.

---

## Highlights

- Continuous privileged session monitoring
- Explainable behavioral risk scoring
- Just-in-Time privileged access
- Live command and query analysis
- Policy-based enforcement engine
- Automated session termination
- Complete, immutable audit trail
- Enterprise authentication support (AD, LDAP, SAML, OAuth2)
- Compliance-ready reporting

---

## Live Demo

| Resource | Link |
|---|---|
| 🌐 Application | https://glint-blue.vercel.app |
| 🎥 Demonstration | https://drive.google.com/file/d/1w2L1zqdJJ6jwAlUp1MBBb1fvlaYs11N6/view?usp=sharing |

---

## Architecture

```mermaid
flowchart TB
    User([User])
    Admin([Security Admin])

    User --> Login
    Admin --> Dashboard

    Login --> Auth[Authentication & MFA]
    Auth --> Broker[Privilege Broker]
    Broker --> Session[Live Session]
    Session --> Monitor[Telemetry Collector]
    Monitor --> Features[Feature Extraction]
    Features --> AI[Risk Intelligence Engine]
    AI --> Policy{Policy Decision}

    Policy -->|Allow| Continue
    Policy -->|Challenge| MFA
    Policy -->|Terminate| Kill

    Continue --> Audit[(Audit Store)]
    MFA --> Audit
    Kill --> Audit
    Audit --> Dashboard
```

## Risk Scoring Pipeline

```mermaid
flowchart LR
    A[Session Started] --> B[Collect Events]
    B --> C[Normalize Data]
    C --> D[Feature Engineering]
    D --> E[Behavior Analytics]
    E --> F[Risk Model]
    F --> G{Risk Level}
    G --> Low
    G --> Medium
    G --> High
    Low --> Continue
    Medium --> Verify
    High --> Response
    Response --> Audit
```

## Decision Engine

```mermaid
stateDiagram-v2
    [*] --> Login
    Login --> Authenticate
    Authenticate --> Session
    Session --> Analyze
    Analyze --> Safe
    Analyze --> Suspicious
    Analyze --> Critical
    Safe --> Continue
    Suspicious --> MFA
    Critical --> Kill
    Continue --> Analyze
    MFA --> Analyze
    Kill --> Audit
    Audit --> [*]
```

## Session Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Auth
    participant Broker
    participant AI
    participant Policy
    participant Dashboard

    User->>Auth: Login
    Auth->>Broker: Create Session
    Broker->>AI: Stream Events
    AI->>Policy: Risk Score
    Policy->>Broker: Decision
    Broker->>Dashboard: Update Session
    Dashboard->>User: Live Status
```

## Privileged Session Lifecycle

```mermaid
journey
    title Privileged Session Lifecycle
    section Login
      User Login: 5: User
      MFA Verification: 5: Auth
    section Access
      Request Privilege: 5: User
      Policy Evaluation: 5: Policy
    section Session
      Access Granted: 5: PAM
      Live Monitoring: 5: AI
    section Detection
      Behavior Analysis: 5: ML
      Threat Detection: 5: AI
    section Response
      Terminate Session: 5: SOC
      Audit Logged: 5: Compliance
```

## Enterprise Deployment

```mermaid
flowchart TB
    subgraph Enterprise
        Users
        Admins
        SOC
    end

    subgraph GLINT
        Frontend
        Backend
        RiskEngine[Risk Engine]
        PolicyEngine[Policy Engine]
        Analytics
        Database
    end

    subgraph External
        LDAP
        AzureAD[Azure AD]
        AWS
        SIEM
        Email
    end

    Users --> Frontend
    Admins --> Frontend
    Frontend --> Backend
    Backend --> RiskEngine
    Backend --> PolicyEngine
    RiskEngine --> Database
    RiskEngine --> SIEM
    PolicyEngine --> LDAP
    PolicyEngine --> AzureAD
    Backend --> AWS
    Analytics --> Email
```

---

## Risk Intelligence Engine

Every privileged session is continuously analyzed using multiple contextual signals, including:

- Login location anomalies
- Device trust
- Session duration
- Command frequency
- Sensitive database access
- Privilege escalation attempts
- Abnormal working hours
- Historical behavior deviation
- Failed authentication patterns
- Insider threat indicators

Each feature contributes to an explainable risk score that evolves throughout the session — no black-box outputs, every point on the score traces back to a source event.

## Automated Response

| Risk Level | Automated Action |
|---|---|
| Low | Continue monitoring |
| Medium | Notify security team |
| High | Require re-authentication |
| Critical | Kill session, revoke credentials, generate incident ticket |

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React · TypeScript · Tailwind CSS |
| Backend | FastAPI · Python |
| AI / Analytics | Scikit-learn · Pandas · NumPy |
| Database | PostgreSQL |
| Authentication | JWT · OAuth2 |
| Deployment | Docker · Vercel · AWS / Azure |

---

## Project Structure

```text
GLINT
├── frontend/
│   ├── components/
│   ├── pages/
│   └── services/
├── backend/
│   ├── api/
│   ├── auth/
│   ├── monitoring/
│   ├── ai/
│   ├── policies/
│   └── database/
├── docs/
├── assets/
└── README.md
```

---

## Quick Start

**Backend**

```bash
git clone https://github.com/<your-repository>
cd GLINT

pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Application runs locally at:

```
Frontend → http://localhost:5173
Backend  → http://localhost:8000
```

---

## Enterprise Integrations

**Authentication** — Active Directory · LDAP · OAuth2 · SAML · Keycloak

**Monitoring** — Splunk · QRadar · Microsoft Sentinel · Elastic

**Cloud** — AWS · Azure · Google Cloud

**ITSM** — ServiceNow · Jira

---

## Why GLINT

| Traditional PAM | GLINT |
|---|---|
| Reactive monitoring | Predictive intelligence |
| Static policies | Adaptive risk decisions |
| Manual investigation | Automated response |
| Session recording only | Behavioral analytics |
| Alerts after the fact | Detection before damage |
| Fixed thresholds | AI-powered risk scoring |

---

## Roadmap

- [ ] Real-time SSH/pgwire session broker for live event ingestion
- [ ] Expanded rule library for deterministic policy overrides
- [ ] SOC case management integration
- [ ] Multi-tenant deployment support
- [ ] Fine-grained RBAC for dashboard access

---

## Team — Impact Minds

- Mohammed Noufal V
- Adithya AM
- Karthikeyan M
- Monissha L

---

<div align="center">

**GLINT** — Predictive Privileged Access Intelligence

[Live Demo](https://glint-blue.vercel.app) · [Demo Video](https://drive.google.com/file/d/1w2L1zqdJJ6jwAlUp1MBBb1fvlaYs11N6/view?usp=sharing)

</div>
