const express = require("express");
const cors = require("cors");
const customers = require("./data");
const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

// Authentication sessions store
const verificationSessions = new Map();

// HEALTH CHECK
app.get("/", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    service: "Kapture Collections Voicebot Backend"
  });
});

// DEBUG / HEALTH ENDPOINT
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    service: "Kapture Collections Voicebot Backend",
    timestamp: new Date().toISOString()
  });
});

// 1. VERIFY CUSTOMER
app.post("/vapi/verify-customer", (req, res) => {
  console.log(
    JSON.stringify(req.body, null, 2)
  );

  // Extract Vapi tool call
  const message = req.body?.message;

  const toolCall =message?.toolCalls?.[0] ||message?.toolCallList?.[0];

  if (!toolCall) {
    console.error(
      "No Vapi tool call found"
    );

    return res.status(200).json({
      results: []
    });
  }

  const toolCallId =
    toolCall.id;

  // Extract arguments
 
  let args =
    toolCall.function?.arguments || {};

  if (typeof args === "string") {

    try {

      args = JSON.parse(args);

    } catch (error) {

      console.error(
        "Failed to parse tool arguments:",
        args
      );

      return res.status(200).json({
        results: [
          {
            toolCallId,

            result:
              JSON.stringify({
                success: false,
                verified: false,
                reason:
                  "Invalid verification arguments"
              })
          }
        ]
      });
    }
  }

  console.log(
    "\nTool arguments:"
  );

  console.log(
    JSON.stringify(
      args,
      null,
      2
    )
  );

  // Extract values

  const customerId =
    args.customerId ||
    req.body?.customerId;

  const dateOfBirth =
    args.dateOfBirth ||
    req.body?.dateOfBirth;

  // Extract Vapi call/session ID

  const sessionId =
    args.sessionId ||
    message?.call?.id ||
    req.body?.call?.id ||
    req.body?.callId ||
    req.body?.sessionId;

  console.log(
    "\nExtracted values:"
  );

  console.log(
    "customerId:",
    customerId
  );

  console.log(
    "dateOfBirth:",
    dateOfBirth
  );

  console.log(
    "sessionId:",
    sessionId
  );

  // Validate required information

  if (!customerId) {

    const result = {
      success: false,
      verified: false,
      reason:
        "Customer ID is required"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,
          result:
            JSON.stringify(result)
        }
      ]
    });
  }

  if (!dateOfBirth) {

    const result = {
      success: false,
      verified: false,
      reason:
        "Date of birth is required"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,
          result:
            JSON.stringify(result)
        }
      ]
    });
  }

  if (!sessionId) {

    const result = {
      success: false,
      verified: false,
      reason:
        "Authentication session could not be established"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,
          result:
            JSON.stringify(result)
        }
      ]
    });
  }

  // Find customer

  const customer =
    customers[customerId];

  if (!customer) {

    console.log(
      "VERIFICATION FAILED: Customer not found"
    );

    const result = {
      success: true,
      verified: false,
      reason:
        "Customer verification failed"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,
          result:
            JSON.stringify(result)
        }
      ]
    });
  }

  // DOB NORMALIZATION

  function normalizeDateOfBirth(value) {

    if (!value) {
      return null;
    }

    let text =
      String(value)
        .trim()
        .toLowerCase();

    console.log(
      "\nOriginal DOB:",
      text
    );

    // Remove ordinal suffixes
    // 15th -> 15
    // 1st  -> 1
    // 2nd  -> 2
    // 3rd  -> 3

    text = text.replace(
      /(\d{1,2})(st|nd|rd|th)\b/g,
      "$1"
    );

    // Remove commas

    text =
      text.replace(/,/g, " ");

    // Normalize multiple spaces

    text =
      text.replace(/\s+/g, " ")
        .trim();

    // YYYY-MM-DD

    let match =
      text.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/
      );

    if (match) {

      const year =
        Number(match[1]);

      const month =
        Number(match[2]);

      const day =
        Number(match[3]);

      return buildDate(
        year,
        month,
        day
      );
    }

    // YYYY/MM/DD
    // Example: 1999/08/15

    match =
      text.match(
        /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/
      );

    if (match) {

      const year =
        Number(match[1]);

      const month =
        Number(match[2]);

      const day =
        Number(match[3]);

      return buildDate(
        year,
        month,
        day
      );
    }

    // MM/DD/YYYY
    // Example: 08/15/1999

    match =
      text.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
      );

    if (match) {

      const month =
        Number(match[1]);

      const day =
        Number(match[2]);

      const year =
        Number(match[3]);

      return buildDate(
        year,
        month,
        day
      );
    }

    // DD/MM/YYYY
    // Example: 15/08/1999

    match =
      text.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
      );

    if (match) {

      const first =
        Number(match[1]);

      const second =
        Number(match[2]);

      const year =
        Number(match[3]);

      // If first > 12, it must be DD/MM/YYYY
      if (first > 12) {

        return buildDate(
          year,
          second,
          first
        );
      }

      // Otherwise default to MM/DD/YYYY
      return buildDate(
        year,
        first,
        second
      );
    }

    // Replace hyphens with spaces
    // Example: August-15-1999

    text =
      text.replace(/-/g, " ");

    text =
      text.replace(/\//g, " ");

    const parts =
      text.split(" ");

    // Month name conversion

    const months = {

      january: 1,
      jan: 1,

      february: 2,
      feb: 2,

      march: 3,
      mar: 3,

      april: 4,
      apr: 4,

      may: 5,

      june: 6,
      jun: 6,

      july: 7,
      jul: 7,

      august: 8,
      aug: 8,

      september: 9,
      sep: 9,
      sept: 9,

      october: 10,
      oct: 10,

      november: 11,
      nov: 11,

      december: 12,
      dec: 12

    };

    // Find year

    const yearIndex =
      parts.findIndex(
        part =>
          /^\d{4}$/.test(part)
      );

    if (yearIndex === -1) {
      return null;
    }

    const year =
      Number(parts[yearIndex]);

    // Find month

    let month = null;

    let monthIndex = -1;

    for (
      let i = 0;
      i < parts.length;
      i++
    ) {

      if (
        months[parts[i]]
      ) {

        month =
          months[parts[i]];

        monthIndex = i;

        break;
      }
    }

    // Month-name date
    // August 15 1999
    // 15 August 1999
    // August-15-1999

    if (
      month !== null
    ) {

      let day = null;

      for (
        let i = 0;
        i < parts.length;
        i++
      ) {

        if (
          i !== yearIndex &&
          i !== monthIndex &&
          /^\d{1,2}$/.test(parts[i])
        ) {

          day =
            Number(parts[i]);

          break;
        }
      }

      if (day !== null) {

        return buildDate(
          year,
          month,
          day
        );
      }
    }

    // Numeric space-separated format
    // Example: 15 08 1999

    const numericParts =
      parts.filter(
        part =>
          /^\d+$/.test(part)
      );

    if (
      numericParts.length === 3
    ) {

      const first =
        Number(numericParts[0]);

      const second =
        Number(numericParts[1]);

      const third =
        Number(numericParts[2]);

      // Determine where the year is
      if (
        first >= 1900 &&
        first <= 2100
      ) {

        return buildDate(
          first,
          second,
          third
        );
      }

      if (
        third >= 1900 &&
        third <= 2100
      ) {

        // If first > 12,
        // it is DD/MM/YYYY

        if (first > 12) {

          return buildDate(
            third,
            second,
            first
          );
        }

        // Otherwise MM/DD/YYYY
        return buildDate(
          third,
          first,
          second
        );
      }
    }

    // Last fallback:
    // JavaScript Date parser

    const parsed =
      new Date(value);

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {

      return buildDate(
        parsed.getFullYear(),
        parsed.getMonth() + 1,
        parsed.getDate()
      );
    }

    return null;
  }
  // Validate actual calendar date

  function buildDate(
    year,
    month,
    day
  ) {

    if (
      year < 1900 ||
      year > 2100
    ) {
      return null;
    }

    if (
      month < 1 ||
      month > 12
    ) {
      return null;
    }

    if (
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    const date =
      new Date(
        year,
        month - 1,
        day
      );

    // Prevent invalid dates such as
    // February 31
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Normalize both DOB values

  const customerDOB =
    normalizeDateOfBirth(
      customer.dateOfBirth
    );

  const receivedDOB =
    normalizeDateOfBirth(
      dateOfBirth
    );

  console.log(
    "\nDOB comparison:"
  );

  console.log(
    "Customer DOB:",
    customerDOB
  );

  console.log(
    "Received DOB:",
    receivedDOB
  );

  // Invalid DOB format
  
  if (!receivedDOB) {

    console.log(
      "VERIFICATION FAILED: Invalid DOB format"
    );

    const result = {

      success: true,

      verified: false,

      reason:
        "Customer verification failed"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,

          result:
            JSON.stringify(result)
        }
      ]
    });
  }

  // Compare DOB

  if (
    customerDOB !==
    receivedDOB
  ) {

    console.log(
      "VERIFICATION FAILED: DOB mismatch"
    );

    const result = {

      success: true,

      verified: false,

      reason:
        "Customer verification failed"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,

          result:
            JSON.stringify(result)
        }
      ]
    });
  }

  // CUSTOMER VERIFIED

  console.log(
    "\n========================================"
  );

  console.log(
    "CUSTOMER VERIFIED SUCCESSFULLY"
  );

  console.log(
    "========================================"
  );

  // Create authenticated session

  verificationSessions.set(
    sessionId,
    {
      customerId:
        customer.customerId,

      verified: true,

      verifiedAt:
        new Date().toISOString()
    }
  );

  // Success result

  const result = {

    success: true,

    verified: true,

    customerId:
      customer.customerId,

    sessionId,

    message:
      "Customer verified successfully"
  };

  console.log(
    "\nVerification result:"
  );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  // Vapi response

  return res.status(200).json({

    results: [

      {
        toolCallId,

        result:
          JSON.stringify(result)
      }

    ]

  });

});

// 2. LOG PROMISE TO PAY

app.post("/vapi/log-promise-to-pay", (req, res) => {

  try {

    console.log("\n========================================");
    console.log("LOG PROMISE TO PAY - VAPI REQUEST");
    console.log("========================================");

    console.log(JSON.stringify(req.body, null, 2));

    const {
      customerId,
      amount,
      promiseDate,
      sessionId
    } = req.body;

    console.log("\nExtracted PTP values:");
    console.log("customerId:", customerId);
    console.log("amount:", amount);
    console.log("promiseDate:", promiseDate);
    console.log("sessionId:", sessionId);

    // Validate required fields

    if (
      !customerId ||
      !amount ||
      !promiseDate ||
      !sessionId
    ) {

      return res.status(400).json({
        success: false,
        error:
          "customerId, amount, promiseDate and sessionId are required"
      });
    }

    // Authentication check

    const session =
      verificationSessions.get(sessionId);

    if (!session || !session.verified) {

      console.log(
        "PTP BLOCKED: Customer not authenticated"
      );

      return res.status(403).json({
        success: false,
        error: "Customer authentication required"
      });
    }

    // Customer/session match

    if (session.customerId !== customerId) {

      return res.status(403).json({
        success: false,
        error:
          "Session does not belong to this customer"
      });
    }

    // Find customer

    const customer =
      customers[customerId];

    if (!customer) {

      return res.status(404).json({
        success: false,
        error: "Customer not found"
      });
    }

    // Validate amount

    const numericAmount = Number(amount);

    if (
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {

      return res.status(400).json({
        success: false,
        error: "Amount must be a valid positive number"
      });
    }

    // Store PTP

    const promise = {
      amount: numericAmount,
      promiseDate,
      status: "COMMITTED",
      createdAt: new Date().toISOString()
    };

    customer.promises.push(promise);

    // Generate PTP ID

    const ptpId =
      `PTP-${Date.now()}`;

    console.log("\nPTP SUCCESS:");
    console.log("PTP ID:", ptpId);

    return res.status(200).json({
      success: true,
      ptpId,
      amount: numericAmount,
      promiseDate,
      message:
        "Promise to pay recorded successfully"
    });

  } catch (error) {

    console.error(
      "PTP ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// 3. SEND PAYMENT LINK

app.post("/vapi/send-payment-link", (req, res) => {

  console.log("\n========================================");
  console.log("SEND PAYMENT LINK - VAPI REQUEST");
  console.log("========================================");

  console.log(
    JSON.stringify(req.body, null, 2)
  );

  // Extract Vapi tool call

  const message = req.body?.message;

  const toolCall =
    message?.toolCalls?.[0] ||
    message?.toolCallList?.[0];

  if (!toolCall) {

    console.error(
      "No Vapi tool call found"
    );

    return res.status(200).json({
      results: []
    });
  }

  const toolCallId =
    toolCall.id;

  // Extract tool arguments

  let args =
    toolCall.function?.arguments || {};

  if (typeof args === "string") {

    try {

      args = JSON.parse(args);

    } catch (error) {

      console.error(
        "Failed to parse payment-link arguments:",
        args
      );

      return res.status(200).json({
        results: [
          {
            toolCallId,

            result: JSON.stringify({
              success: false,
              error:
                "Invalid payment-link arguments"
            })
          }
        ]
      });
    }
  }

  console.log(
    "\nPayment-link tool arguments:"
  );

  console.log(
    JSON.stringify(
      args,
      null,
      2
    )
  );

  // Extract customer ID

  const customerId =
    args.customerId ||
    req.body?.customerId ||
    "RAHUL001";

  // Extract channel

  const channel =
    args.channel ||
    req.body?.channel ||
    "SMS";

  // Extract Vapi call/session ID

  const sessionId =
    args.sessionId ||
    message?.call?.id ||
    req.body?.call?.id ||
    req.body?.callId ||
    req.body?.sessionId;

  console.log(
    "\nExtracted payment-link values:"
  );

  console.log(
    "customerId:",
    customerId
  );

  console.log(
    "channel:",
    channel
  );

  console.log(
    "sessionId:",
    sessionId
  );

  // Validate session

  if (!sessionId) {

    console.error(
      "PAYMENT LINK BLOCKED: Session ID missing"
    );

    const result = {
      success: false,
      error:
        "Authentication session could not be established"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,

          result:
            JSON.stringify(result)
        }
      ]
    });
  }

  // Check authentication

  const session =
    verificationSessions.get(
      sessionId
    );

  console.log(
    "\nAuthentication session:"
  );

  console.log(
    session
  );

  if (
    !session ||
    !session.verified
  ) {

    console.error(
      "PAYMENT LINK BLOCKED: Customer not authenticated"
    );

    const result = {
      success: false,
      error:
        "Customer authentication required"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,

          result:
            JSON.stringify(result)
        }
      ]
    });
  }
  // Check customer ownership

  if (
    session.customerId !==
    customerId
  ) {

    console.error(
      "PAYMENT LINK BLOCKED: Session/customer mismatch"
    );

    const result = {
      success: false,
      error:
        "Session does not belong to this customer"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,

          result:
            JSON.stringify(result)
        }
      ]
    });
  }

  // Find customer

  const customer =
    customers[customerId];

  if (!customer) {

    console.error(
      "Customer not found:",
      customerId
    );

    const result = {
      success: false,
      error:
        "Customer not found"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,

          result:
            JSON.stringify(result)
        }
      ]
    });
  }

  // Generate mock payment link

  const paymentId =
    `PAY-${Date.now()}`;

  const paymentLink =
    `https://kapture-finance.example/pay/${paymentId}`;

  // Store payment-link information

  if (!customer.paymentLinks) {
    customer.paymentLinks = [];
  }

  customer.paymentLinks.push({

    paymentId,

    paymentLink,

    channel,

    createdAt:
      new Date().toISOString(),

    status:
      "GENERATED"
  });

  // Success

  const result = {

    success: true,

    paymentId,

    paymentLink,

    channel,

    customerId,

    message:
      `Payment link generated successfully and ready to be sent via ${channel}.`
  };

  console.log(
    "\nPAYMENT LINK GENERATED:"
  );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  // Return Vapi-compatible response

  return res.status(200).json({

    results: [

      {
        toolCallId,

        result:
          JSON.stringify(result)
      }

    ]

  });

});

// 4. ESCALATE TO HUMAN AGENT

app.post("/vapi/escalate-to-agent", (req, res) => {

  console.log("\n========================================");
  console.log("ESCALATE TO AGENT - VAPI REQUEST");
  console.log("========================================");

  console.log(
    JSON.stringify(req.body, null, 2)
  );

  // Extract Vapi tool call

  const message = req.body?.message;

  const toolCall =
    message?.toolCalls?.[0] ||
    message?.toolCallList?.[0];

  if (!toolCall) {

    console.error(
      "No Vapi tool call found"
    );

    return res.status(200).json({
      results: []
    });
  }

  const toolCallId =
    toolCall.id;

  // Extract arguments

  let args =
    toolCall.function?.arguments || {};

  if (typeof args === "string") {

    try {

      args = JSON.parse(args);

    } catch (error) {

      console.error(
        "Failed to parse escalation arguments:",
        args
      );

      return res.status(200).json({
        results: [
          {
            toolCallId,

            result: JSON.stringify({
              success: false,
              error:
                "Invalid escalation arguments"
            })
          }
        ]
      });
    }
  }

  console.log(
    "\nEscalation arguments:"
  );

  console.log(
    JSON.stringify(
      args,
      null,
      2
    )
  );

  // Extract values

  const customerId =
    args.customerId ||
    req.body?.customerId ||
    "RAHUL001";

  const reason =
    args.reason ||
    "Customer requested human assistance";

  const summary =
    args.summary ||
    "Customer requires assistance from a human collections agent.";

// Extract Vapi call/session ID 

  const sessionId =
    args.sessionId ||
    message?.call?.id ||
    req.body?.call?.id ||
    req.body?.callId ||
    req.body?.sessionId;

  console.log(
    "\nExtracted escalation values:"
  );

  console.log(
    "customerId:",
    customerId
  );

  console.log(
    "reason:",
    reason
  );

  console.log(
    "summary:",
    summary
  );

  console.log(
    "sessionId:",
    sessionId
  );

  // Validate session

  if (!sessionId) {

    console.error(
      "ESCALATION BLOCKED: Session ID missing"
    );

    const result = {
      success: false,
      error:
        "Authentication session could not be established"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,

          result:
            JSON.stringify(result)
        }
      ]
    });
  }

  // Check authentication

  const session =
    verificationSessions.get(
      sessionId
    );

  console.log(
    "\nAuthentication session:"
  );

  console.log(
    session
  );

  if (
    !session ||
    !session.verified
  ) {

    console.error(
      "ESCALATION BLOCKED: Customer not authenticated"
    );

    const result = {
      success: false,
      error:
        "Customer authentication required"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,

          result:
            JSON.stringify(result)
        }
      ]
    });
  }

  // Verify customer ownership

  if (
    session.customerId !==
    customerId
  ) {

    console.error(
      "ESCALATION BLOCKED: Customer/session mismatch"
    );

    const result = {
      success: false,
      error:
        "Session does not belong to this customer"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,

          result:
            JSON.stringify(result)
        }
      ]
    });
  }

  // Check customer

  const customer =
    customers[customerId];

  if (!customer) {

    console.error(
      "Customer not found:",
      customerId
    );

    const result = {
      success: false,
      error:
        "Customer not found"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,

          result:
            JSON.stringify(result)
        }
      ]
    });
  }

  // Generate mock case ID

  const caseId =
    `CASE-${Date.now()}`;

  // Store escalation

  if (!customer.escalations) {
    customer.escalations = [];
  }

  customer.escalations.push({

    caseId,

    reason,

    summary,

    status:
      "ESCALATED",

    createdAt:
      new Date().toISOString()
  });

  // Success result

  const result = {

    success: true,

    caseId,

    status:
      "ESCALATED",

    customerId,

    reason,

    message:
      "Customer has been escalated to a human collections agent."
  };

  console.log(
    "\nESCALATION CREATED:"
  );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  // Return Vapi-compatible result

  return res.status(200).json({

    results: [

      {
        toolCallId,

        result:
          JSON.stringify(result)
      }

    ]

  });

});

// 5. MARK CALL DISPOSITION

app.post("/vapi/mark-disposition", (req, res) => {

  console.log("\n========================================");
  console.log("MARK DISPOSITION - VAPI REQUEST");
  console.log("========================================");

  console.log(JSON.stringify(req.body, null, 2));

  // Extract Vapi tool call

  const message = req.body?.message;

  const toolCall =
    message?.toolCalls?.[0] ||
    message?.toolCallList?.[0];

  if (!toolCall) {

    console.error("No Vapi tool call found");

    return res.status(200).json({
      results: []
    });
  }

  const toolCallId = toolCall.id;

  // Extract arguments

  let args =
    toolCall.function?.arguments || {};

  if (typeof args === "string") {

    try {
      args = JSON.parse(args);
    } catch (error) {

      console.error(
        "Failed to parse disposition arguments:",
        args
      );

      return res.status(200).json({
        results: [
          {
            toolCallId,
            result: JSON.stringify({
              success: false,
              error: "Invalid disposition arguments"
            })
          }
        ]
      });
    }
  }

  console.log("\nDisposition arguments:");
  console.log(
    JSON.stringify(args, null, 2)
  );

  // Extract values

  const customerId =
    args.customerId ||
    req.body?.customerId ||
    "RAHUL001";

  const disposition =
    args.disposition;

  const notes =
    args.notes ||
    "";

  // Extract Vapi call/session ID

  const sessionId =
    args.sessionId ||
    message?.call?.id ||
    req.body?.call?.id ||
    req.body?.callId ||
    req.body?.sessionId;

  console.log("\nExtracted disposition values:");
  console.log(
    "customerId:",
    customerId
  );

  console.log(
    "disposition:",
    disposition
  );

  console.log(
    "notes:",
    notes
  );

  console.log(
    "sessionId:",
    sessionId
  );

  // Validate

  if (!disposition) {

    const result = {
      success: false,
      error: "Disposition is required"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,
          result: JSON.stringify(result)
        }
      ]
    });
  }

  if (!sessionId) {

    const result = {
      success: false,
      error:
        "Authentication session could not be established"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,
          result: JSON.stringify(result)
        }
      ]
    });
  }

  // Authentication check

  const session =
    verificationSessions.get(sessionId);

  if (!session || !session.verified) {

    console.error(
      "DISPOSITION BLOCKED: Customer not authenticated"
    );

    const result = {
      success: false,
      error:
        "Customer authentication required"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,
          result: JSON.stringify(result)
        }
      ]
    });
  }

  // Customer ownership check

  if (session.customerId !== customerId) {

    const result = {
      success: false,
      error:
        "Session does not belong to this customer"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,
          result: JSON.stringify(result)
        }
      ]
    });
  }

  // Find customer

  const customer =
    customers[customerId];

  if (!customer) {

    const result = {
      success: false,
      error: "Customer not found"
    };

    return res.status(200).json({
      results: [
        {
          toolCallId,
          result: JSON.stringify(result)
        }
      ]
    });
  }

  // Store disposition

  if (!customer.dispositions) {
    customer.dispositions = [];
  }

  const dispositionId =
    `DISP-${Date.now()}`;

  const record = {

    dispositionId,

    disposition,

    notes,

    createdAt:
      new Date().toISOString(),

    status:
      "RECORDED"
  };

  customer.dispositions.push(record);

  // Success

  const result = {

    success: true,

    dispositionId,

    customerId,

    disposition,

    status:
      "RECORDED",

    message:
      "Call disposition recorded successfully."
  };

  console.log(
    "\nDISPOSITION RECORDED:"
  );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  // Vapi response

  return res.status(200).json({

    results: [

      {
        toolCallId,

        result:
          JSON.stringify(result)
      }

    ]

  });

});


// START SERVER

app.listen(PORT, () => {

  console.log(
    `\nKapture backend running on http://localhost:${PORT}`
  );
});