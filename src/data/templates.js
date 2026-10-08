/**
 * Supplier message templates, and the one customer reply template that
 * is in here as an example. Real wording is maintained by the CS team.
 */

export const TEMPLATES ={
  "Request POD":function(c,f){ return "Hi "+f.s.supplier+" team,\n\nPlease provide the proof of delivery for order "+c.order+
    " ("+f.s.name+").\n\nWe need: carrier name, tracking number, delivery date and the signature or GPS proof of delivery.\n"+
    "The customer has opened a payment dispute, so we need this within 24 hours to submit our evidence in time.\n\nThanks."; },
  "Request size chart":function(c,f){ return "Hi "+f.s.supplier+" team,\n\nPlease send the measurement chart for this product: "+
    (c.purl||"(product link)")+"\nOrder "+c.order+" ("+f.s.name+").\n\nWe need the measurements in centimetres per size: chest, waist, hips, length and sleeve.\n"+
    "Once received we will store it on the product so we do not have to ask again.\n\nThanks."; },
  "Request material":function(c,f){ return "Hi "+f.s.supplier+" team,\n\nPlease send the material composition for this product: "+
    (c.purl||"(product link)")+"\nOrder "+c.order+" ("+f.s.name+").\n\nWe need the fabric breakdown in percentages, the washing and care instructions, and the lining if there is one.\n"+
    "The customer is asking before we can answer, and we will store it on the product so we do not have to ask again.\n\nThanks."; },
  "Order status":function(c,f){ return "Hi "+f.s.supplier+" team,\n\nCould you confirm the current status of order "+c.order+
    " ("+f.s.name+")?\n\nThe tracking has not updated and the customer is asking. Please confirm whether it has shipped, "+
    "the current location and the expected delivery date.\n\nThanks."; },
  "Wrong item shipped":function(c,f){ return "Hi "+f.s.supplier+" team,\n\nOrder "+c.order+" ("+f.s.name+
    ") was delivered with the wrong item. Photos are attached to this case.\n\n"+
    "Please confirm: the item that was picked, whether a replacement can be sent, and the credit for the incorrect item.\n\nThanks."; }
};



export const TEMPLATE ={
  g:"Order status",
  t:"Where is my order",
  b:"Thanks for reaching out. Your order {order} is on its way and the tracking is moving again.\n\nYou can follow it here: {tracking}\n\nDelivery usually takes a few more days from here. If it has not arrived by then, reply to this email and we will sort it out for you."
};
