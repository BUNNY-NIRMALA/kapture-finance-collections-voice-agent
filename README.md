# kapture-finance-collections-voice-agent
An AI-powered outbound collections voice agent built using Vapi, Node.js, and Express.js for handling overdue loan EMI conversations in a secure, professional, and automated manner.

The voice agent, Maya, communicates with customers, authenticates their identity, discusses overdue payments after successful verification, records payment commitments, provides payment links, escalates to human agents when required, records call dispositions, and closes the call naturally.

1. Project Overview
───────────────────

This project implements an AI-powered voice collections assistant for Kapture Finance.

The assistant is designed to handle common overdue EMI scenarios through a natural phone conversation.

The main objectives are:

- Authenticate the customer before revealing account information
- Protect customer account information from unauthenticated callers
- Discuss overdue EMI details after successful authentication
- Capture a customer's Promise to Pay (PTP)
- Generate a payment link
- Escalate the conversation to a human agent when necessary
- Record the final disposition of the call
- Automatically close the call after completing the required action

The implementation uses controlled mock customer data and mock business operations to demonstrate the complete end-to-end workflow.


2. Customer Scenario
────────────────────

The prototype uses the following mock customer:

| Field | Value |
|---|---|
| Customer Name | Rahul Sharma |
| Customer ID | RAHUL001 |
| Loan Type | Personal Loan |
| Overdue EMI | ₹8,499 |
| Days Past Due | 12 days |

The customer information is mock data created specifically for demonstrating the voice-agent workflow.


3. Key Features
───────────────

### Customer Authentication

The assistant asks the customer to verify their date of birth before discussing account-specific information.

Authentication is validated by the backend rather than relying only on the AI prompt.

### Overdue EMI Discussion

After successful authentication, the assistant can safely discuss:

- Loan type
- Overdue EMI amount
- Days past due
- Available payment options

### Promise to Pay

The customer can provide:

- Payment amount
- Promise date

The backend records the Promise to Pay after validating the authenticated session.

### Payment Link

The customer can request a payment link.

The backend checks authentication before generating the payment link.

### Human Agent Escalation

The assistant can transfer/escalate the conversation when:

- The customer requests a human
- The customer has a complex dispute
- The customer reports financial hardship
- The customer has a complaint
- The AI cannot safely resolve the issue

### Call Disposition

The final outcome of the conversation is recorded using a disposition.

### Automatic Call Closure

After completing the required business action and recording the disposition, Maya provides a short closing message and ends the call without waiting indefinitely for another response.


4. Architecture
────────────────

```text
                         ┌─────────────────────┐
                         │      Customer       │
                         │     Phone Call      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │        Vapi         │
                         │                     │
                         │ Telephony           │
                         │ Speech-to-Text      │
                         │ Text-to-Speech      │
                         │ Tool Calling        │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Maya AI Agent    │
                         │     Collections     │
                         └──────────┬──────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
        verify_customer       Collections        Escalation
                 │             Operations              │
                 │                  │                  │
                 └──────────────────┼──────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Node.js Backend   │
                         │      Express.js     │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     Mock Data       │
                         │                     │
                         │ Customer Records    │
                         │ PTP Records         │
                         │ Payment Links       │
                         │ Dispositions        │
                         └─────────────────────┘

```
5. Technology Stack
───────────────────
Vapi – Voice AI, telephony, speech processing and tool calling
Node.js – Backend runtime
Express.js – REST API framework
JavaScript – Backend implementation
ngrok – Public HTTPS tunnel for exposing the local backend to Vapi
GitHub – Source-code repository
Project Structure
kapture-collections-voicebot/
│
├── backend/
│   ├── data.js
│   └── server.js
│
├── package.json
├── package-lock.json
├── .gitignore
└── README.md

6. Vapi Tools
─────────────

The assistant uses the following backend tools:
verify_customer
log_promise_to_pay
send_payment_link
escalate_to_agent
mark_disposition
verify_customer
──────────────────────────────
The verify_customer tool authenticates the customer using:

Customer ID
Date of birth

The assistant requests the customer's complete date of birth.

The backend normalizes different date formats before comparison.

Examples of supported formats include:

```text
 August 15, 1999
August 15 1999
August 15th, 1999
15 August 1999
15th August 1999
1999-08-15
1999/08/15
08/15/1999
15/08/1999
```

The backend converts valid representations to a normalized format such as:

1999-08-15

The normalized value is then compared against the customer's stored date of birth.

If authentication succeeds, an authenticated verification session is created.

If authentication fails, the assistant must not reveal account-specific information.

Authentication and Security
──────────────────────────────

Authentication is enforced on the backend.

The AI assistant cannot independently bypass the authentication requirement through conversation or prompt instructions.

The general flow is:

```
                                          Customer
                                             │
                                             ▼
                                          Provide Date of Birth
                                             │
                                             ▼
                                          verify_customer
                                             │
                                             ├───────────────┐
                                             │               │
                                             ▼               ▼
                                          FAILED           SUCCESS
                                             │               │
                                             ▼               ▼
                                          No account       Authenticated
                                          information      session
                                             │               │
                                             │               ▼
                                             │        Account information
                                             │        can be discussed
                                             │               │
                                             │               ├── PTP
                                             │               └── Payment Link
                                             │
                                             ▼
                                          Safe call closure
```
Protected backend operations validate the authentication session before processing sensitive actions.

This prevents operations such as Promise to Pay or payment-link generation from being executed for an unauthenticated customer.

7. Main Conversation Flow
───────────────────────────
```
                                          1. Maya introduces herself
                                                    ↓
                                          2. Confirms the customer identity
                                                    ↓
                                          3. Requests date of birth
                                                    ↓
                                          4. verify_customer
                                                    ↓
                                          5. Authentication result
                                                    ↓
                                          6. If successful, disclose overdue information
                                                    ↓
                                          7. Understand customer intent
                                                    ↓
                                          8. Execute the appropriate business tool
                                                    ↓
                                          9. Record call disposition
                                                    ↓
                                          10. Provide a short closing message
                                                    ↓
                                          11. End the call
```
8. Successful Authentication Flow
──────────────────────────────────

Example:
```
Maya:
"Hi, this is Maya from Kapture Finance Collections.
Am I speaking with Rahul?"


Customer:
"Yes, this is Rahul."


Maya:
"For security purposes, could you please verify your
date of birth?"


Customer:
"My date of birth is August 15th, 1999."


        ↓


verify_customer
        ↓
Successful authentication


        ↓


Maya:
"Thank you for verifying your identity.
I'm calling regarding an overdue EMI on your personal loan.
The overdue amount is ₹8,499 and it is currently
12 days past due."
```

The overdue amount is not disclosed before successful authentication.

9. Promise-to-Pay Flow
───────────────────────

If the customer agrees to make the payment, Maya collects the required information.

Example:
```
Maya:
"How would you like to proceed with the payment?"


Customer:
"I can pay the full amount on August 20."


Maya:
"Just to confirm, you are committing to pay ₹8,499
on August 20, 2026. Is that correct?"


Customer:
"Yes."


        ↓


log_promise_to_pay
        ↓
Promise recorded
        ↓
mark_disposition
        ↓
PTP_COMMITTED
        ↓
Closing message
        ↓
Call ends
```
The backend validates the authenticated customer session before recording the Promise to Pay.

10. Payment-Link Flow
─────────────────────

If the authenticated customer requests a payment link:
                            ```
                            Customer requests payment link
                                          ↓
                            Authentication validation
                                          ↓
                            send_payment_link
                                          ↓
                            Mock payment link generated
                                          ↓
                            mark_disposition
                                          ↓
                            PAYMENT_LINK_SENT
                                          ↓
                            Closing message
                                          ↓
                            Call ends
                            ```
The prototype generates a mock payment URL.

Example:

https://pay.kapture.example/RAHUL001

The assistant does not claim that the payment link was successfully generated or sent unless the backend operation succeeds.

11. Human-Agent Escalation
──────────────────────────

The assistant can escalate a conversation to a human agent.

Typical escalation situations include:

Customer requests a human
Complex account dispute
Financial hardship
Customer complaint
Situation outside the AI's safe capabilities

Example:
                          ```
                            Customer:
                            "I want to speak to a human representative."
                            
                            
                                    ↓
                            
                            
                            escalate_to_agent
                                    ↓
                            
                            
                            ESCALATED
                                    ↓
                            
                            
                            mark_disposition
                                    ↓
                            
                            
                            Closing message
                                    ↓
                            
                            
                            Call ends
                            ```
12. Call Disposition
────────────────────

The mark_disposition tool records the final outcome of the conversation.

Supported outcomes include:
```
PTP_COMMITTED
PAYMENT_LINK_SENT
CANNOT_PAY
DISPUTED
ALREADY_PAID
WRONG_PERSON
DO_NOT_CALL
CALLBACK_REQUESTED
ESCALATED
AUTHENTICATION_FAILED
```
Example:

Customer Situation ->	Disposition
Customer commits to payment	-> PTP_COMMITTED
Payment link successfully generated	-> PAYMENT_LINK_SENT
Customer cannot currently pay -> CANNOT_PAY
Customer disputes the account -> DISPUTED
Customer already paid	-> ALREADY_PAID
Customer requests human assistance	-> ESCALATED
Wrong person reached ->	WRONG_PERSON
Customer requests no further calls ->	DO_NOT_CALL
Customer requests callback ->	CALLBACK_REQUESTED

13. Customer Intent Handling
────────────────────────────

The assistant is designed to recognize common collections scenarios.

Will Pay

The assistant collects the payment amount and promise date and records a Promise to Pay.

Already Paid

The assistant does not falsely confirm payment. It records the customer's claim and can escalate if account investigation is required.

Cannot Pay

The assistant remains respectful and can offer escalation to a human representative.

Dispute

The assistant does not argue with the customer and can escalate complex disputes.

Human Agent Request

The assistant escalates directly to a human representative.

Do Not Call

The assistant respects the request and records the appropriate disposition.

Wrong Person

The assistant does not disclose account information to a third party.

14. Conversation Safety
───────────────────────

The assistant is designed to:

Authenticate before disclosing sensitive account information
Avoid revealing debt information to unauthenticated people
Avoid fabricating payment confirmations
Avoid fabricating tool results
Avoid claiming a payment link was sent when the backend failed
Respect customer requests for human assistance
Respect do-not-call requests
Avoid threatening or abusive language
Keep phone responses concise and natural

The backend is treated as the source of truth for protected business operations.

15. Automatic Call Closure
──────────────────────────
After the required business operation is successfully completed and the disposition is recorded, Maya provides a short closing message.

Examples:
```
"Thank you for your time. Your payment commitment has
been recorded. Have a great day."
```
16. Production Improvements
────────────────────────────

Potential production improvements include:

Persistent database
Real loan-management system integration
Real payment gateway integration
CRM integration
Persistent authentication/session storage
Secure secrets management
PII encryption
Call recording and audit storage
Monitoring and alerting
Rate limiting
Authentication token management
Production-grade human-agent handoff
Compliance monitoring
Analytics and reporting

17. Project Outcome
───────────────────
The prototype demonstrates an end-to-end AI collections workflow:
               
                        Secure Authentication
                                ↓
                        Controlled Account Disclosure
                                ↓
                        Customer Intent Detection
                                ↓
                        Payment Resolution
                                ↓
                        PTP / Payment Link / Escalation
                                ↓
                        Call Disposition
                                ↓
                        Natural Call Closure


The key design principle is that the AI handles the conversation while the backend enforces the important business and security rules.

18. Conclusion
───────────────

The Kapture Finance Collections Voice Agent demonstrates how a voice AI assistant can automate common collections conversations while maintaining authentication and backend validation for sensitive operations.

The system combines Vapi voice capabilities with a Node.js/Express backend to provide:

Secure customer verification
Controlled account-information disclosure
Promise-to-Pay handling
Payment-link generation
Human-agent escalation
Call disposition tracking
Natural automated call closure

The customer and payment information used in this project are mock data intended for demonstration purposes.
└─────────────────────┘
