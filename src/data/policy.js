/**
 * The numbers the business runs on: the refund window, the refund
 * ladders per niche and country, the evidence deadlines per reason,
 * and the QA specialist per team.
 */

/* Na hoeveel dagen na levering er geen refund meer uitgaat. */
export const REFUND_WINDOW =30;
export const LADDER ={"fashion-eu":[10,15,20,100],"fashion-uk-us":[15,25,30,100],"general":[15,20,100]};

/* Bewijstermijnen. Shopify meldt 7–21 dagen per dispute, PayPal sluit een
   dispute na 20 dagen als hij niet geëscaleerd is. */
export const DUE ={"Threatens chargeback":48,"Threatens PayPal dispute":48,
         "Chargeback opened":240,"PayPal dispute opened":480,"Prevention alert (Ethoca/RDR)":24};
export const SPECIALIST ={"Team 1":"jessa","Team 2":"royce","Team 3":"grazielle"};
