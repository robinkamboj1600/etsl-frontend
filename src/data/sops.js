/**
 * The customer service SOPs as they are drawn on the CS SOP screen.
 */

export const SOPS = [
  {
    id: "cancel",
    name: "Cancellation",
    head: "All niches · Cancellation request · All countries",
    step: { t: "Step 1 · Check the order", d: "Order number + reason" },
    dec: { t: "Still unfulfilled?" },
    left: {
      label: "Yes",
      tone: "good",
      nodes: [
        { t: "Cancel the order", d: "Flag for team" },
        { t: "Confirm to customer", d: "Cancellation + refund" },
      ],
    },
    right: {
      label: "No, already fulfilled",
      tone: "crit",
      nodes: [
        { t: "Cancellation not possible", d: "Order is already in production" },
        { t: "Explain + reassure", d: "We help once the parcel arrives" },
        { t: "Refer to return flow", d: "Once the order is received" },
      ],
    },
    rule: {
      t: "Cancellation is only possible while the order is unfulfilled",
      d: "Never promise a cancellation before checking the order status",
    },
  },

  {
    id: "eu",
    name: "Fashion · EU",
    head: "Fashion niche · Return request · EU stores",
    step: {
      t: "Step 1 · Collect info",
      d: "Reason + photo or video, within 30 days",
    },
    dec: {
      t: "Caused by the supplier?",
      d: "Sizing or quality fault by supplier",
    },
    left: {
      label: "Yes",
      tone: "crit",
      nodes: [
        { t: "Free replacement" },
        {
          t: "100% store voucher",
          d: "Order anything for the purchase amount",
          e: "Declines",
        },
        { t: "100% refund", e: "Declines" },
      ],
    },
    right: {
      label: "No",
      tone: "accent",
      nodes: [
        {
          t: "Step 2 · New items for 30%",
          d: "Pays 30%, items up to order value",
        },
        { t: "Step 3 · 10% partial refund", e: "Declines" },
        {
          t: "Step 4 · Send return instructions",
          d: "+ offer 15% partial refund instead",
          e: "Declines",
        },
        {
          t: "Step 5 · Final offer",
          d: "20% instead of returning",
          e: "Chooses return or declines",
        },
        {
          t: "Step 6 · Process return",
          d: "Refer back to return instructions",
          e: "Declines",
          tone: "muted",
        },
      ],
    },
    rule: {
      t: "Customer accepts an offer at any step: flag for team",
      tone: "good",
    },
  },

  {
    id: "ukus",
    name: "Fashion · UK/USA",
    head: "Fashion niche · Return request · UK and USA stores",
    step: {
      t: "Step 1 · Collect info",
      d: "Reason + photo or video, within 30 days",
    },
    dec: {
      t: "Caused by the supplier?",
      d: "Sizing or quality fault by supplier",
    },
    left: {
      label: "Yes",
      tone: "crit",
      nodes: [
        { t: "Free replacement" },
        {
          t: "100% store voucher",
          d: "Order anything for the purchase amount",
          e: "Declines",
        },
        { t: "100% refund", e: "Declines" },
      ],
    },
    right: {
      label: "No",
      tone: "accent",
      nodes: [
        {
          t: "Step 2 · New items for 30%",
          d: "Pays 30%, items up to order value",
        },
        { t: "Step 3 · 15% partial refund", e: "Declines" },
        {
          t: "Step 4 · Send return instructions",
          d: "+ offer 25% partial refund instead",
          e: "Declines",
        },
        {
          t: "Step 5 · Final offer",
          d: "30% instead of returning",
          e: "Chooses return or declines",
        },
        {
          t: "Step 6 · Process return",
          d: "Refer back to return instructions",
          e: "Declines",
          tone: "muted",
        },
      ],
    },
    rule: {
      t: "Customer accepts an offer at any step: flag for team",
      tone: "good",
    },
  },

  {
    id: "general",
    name: "General niche",
    head: "General niche · Return request · All countries",
    step: {
      t: "Step 1 · Collect info",
      d: "Reason + photo or video, within 30 days",
    },
    dec: {
      t: "Caused by the supplier?",
      d: "Sizing or quality fault by supplier",
    },
    left: {
      label: "Yes",
      tone: "crit",
      nodes: [
        { t: "Free replacement" },
        {
          t: "100% store voucher",
          d: "Order anything for the purchase amount",
          e: "Declines",
        },
        { t: "100% refund", e: "Declines" },
      ],
    },
    right: {
      label: "No",
      tone: "accent",
      nodes: [
        {
          t: "Step 2 · New items for 50%",
          d: "Pays 50%, items up to order value",
        },
        { t: "Step 3 · Send return instructions", e: "Declines" },
        { t: "Step 4 · 15% partial refund", e: "Chooses return or declines" },
        {
          t: "Step 5 · Final offer",
          d: "20% instead of returning",
          e: "Declines",
        },
        {
          t: "Step 6 · Process return",
          d: "Refer back to return instructions",
          e: "Declines",
          tone: "muted",
        },
      ],
    },
    rule: {
      t: "Customer accepts an offer at any step: flag for team",
      tone: "good",
    },
  },
];
