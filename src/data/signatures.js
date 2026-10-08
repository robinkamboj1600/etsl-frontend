/**
 * Signatures per country and the customer confirmation texts per
 * language. The wording is placeholder and must be approved before it
 * goes to a customer.
 */

/* Groet en teamregel per land, in dezelfde stijl als de bestaande handtekeningen. */
export const SIGN = {
  UK: ["Kind regards,", "Customer Service Team"],
  US: ["Kind regards,", "Customer Service Team"],
  IE: ["Kind regards,", "Customer Service Team"],
  AU: ["Kind regards,", "Customer Service Team"],
  SE: ["Med vänliga hälsningar,", "Kundtjänstteamet"],
  NO: ["Med vennlig hilsen,", "Kundeserviceteamet"],
  DK: ["Med venlig hilsen,", "Kundeserviceteamet"],
  FI: ["Ystävällisin terveisin,", "Asiakaspalvelutiimi"],
  PL: ["Z poważaniem,", "Zespół Obsługi Klienta"],
  NL: ["Met vriendelijke groet,", "Klantenserviceteam"],
  BE: ["Met vriendelijke groet,", "Klantenserviceteam"],
  DE: ["Mit freundlichen Grüßen,", "Kundendienst-Team"],
  AT: ["Mit freundlichen Grüßen,", "Kundendienst-Team"],
  CH: ["Freundliche Grüsse,", "Kundendienst-Team"],
  FR: ["Cordialement,", "Service Client"],
  ES: ["Un cordial saludo,", "Equipo de Atención al Cliente"],
  IT: ["Cordiali saluti,", "Team Assistenza Clienti"],
  PT: ["Com os melhores cumprimentos,", "Equipa de Apoio ao Cliente"],
};

/* ---- confirmation to the customer -------------------------------------
   PLACEHOLDER WORDING — this is my phrasing, not Empire's. Replace each
   line with the approved text and a native speaker should read it before
   it goes live. {name} {order} {amount} {code} are filled in for you and
   the signature in the customer's own language is added underneath. ---- */
export const LANG_OF = {
  UK: "en",
  US: "en",
  IE: "en",
  AU: "en",
  SE: "sv",
  NO: "no",
  DK: "da",
  FI: "fi",
  PL: "pl",
  NL: "nl",
  BE: "nl",
  DE: "de",
  AT: "de",
  CH: "de",
  FR: "fr",
  ES: "es",
  IT: "it",
  PT: "pt",
  CZ: "en",
  HU: "en",
  HR: "en",
  GR: "en",
};
export const CONFIRM = {
  en: {
    hi: "Hi {name},",
    refund:
      "Your refund for order {order} has been processed. {amount} is on its way back to the payment method you used.\n\nDepending on your bank it can take 3 to 5 working days before it shows on your statement. You do not need to do anything else.",
    cancel:
      "Your order {order} has been cancelled, so nothing will be shipped. {amount} has been refunded to the payment method you used.\n\nDepending on your bank it can take 3 to 5 working days before it shows on your statement.",
    repl: "A replacement for order {order} is on its way to you at no extra cost. You will receive a new tracking number as soon as the parcel is on the move.",
    voucher:
      "Here is your store credit for order {order}: {code}, worth {amount}.\n\nEnter it at checkout and the amount comes off your total. It does not expire.",
    mod: "Your order {order} has been updated as you asked: {change}.\n\nNothing else about the order changes. You will get the tracking number as soon as it ships.",
  },
  nl: {
    hi: "Hallo {name},",
    refund:
      "Je terugbetaling voor bestelling {order} is verwerkt. {amount} is onderweg terug naar de betaalmethode die je hebt gebruikt.\n\nAfhankelijk van je bank duurt het 3 tot 5 werkdagen voordat het op je afschrift staat. Je hoeft verder niets te doen.",
    cancel:
      "Je bestelling {order} is geannuleerd, er wordt dus niets verzonden. {amount} is teruggestort op de betaalmethode die je hebt gebruikt.\n\nAfhankelijk van je bank duurt het 3 tot 5 werkdagen voordat het op je afschrift staat.",
    repl: "Een vervangend artikel voor bestelling {order} is zonder extra kosten naar je onderweg. Je ontvangt een nieuw trackingnummer zodra het pakket onderweg is.",
    voucher:
      "Hier is je tegoed voor bestelling {order}: {code}, ter waarde van {amount}.\n\nVul het in bij het afrekenen en het bedrag gaat van je totaal af. Het verloopt niet.",
    mod: "Je bestelling {order} is aangepast zoals je vroeg: {change}.\n\nVerder verandert er niets aan de bestelling. Je ontvangt het trackingnummer zodra hij verzonden is.",
  },
  de: {
    hi: "Hallo {name},",
    refund:
      "Ihre Rückerstattung für Bestellung {order} wurde ausgeführt. {amount} ist auf dem Weg zurück zu dem von Ihnen genutzten Zahlungsmittel.\n\nJe nach Bank dauert es 3 bis 5 Werktage, bis der Betrag auf Ihrem Kontoauszug erscheint. Sie müssen nichts weiter tun.",
    cancel:
      "Ihre Bestellung {order} wurde storniert, es wird also nichts versandt. {amount} wurde auf das von Ihnen genutzte Zahlungsmittel zurückerstattet.\n\nJe nach Bank dauert es 3 bis 5 Werktage, bis der Betrag auf Ihrem Kontoauszug erscheint.",
    repl: "Ein Ersatzartikel für Bestellung {order} ist ohne zusätzliche Kosten zu Ihnen unterwegs. Sie erhalten eine neue Sendungsnummer, sobald das Paket unterwegs ist.",
    voucher:
      "Hier ist Ihr Guthaben für Bestellung {order}: {code} im Wert von {amount}.\n\nGeben Sie es an der Kasse ein, dann wird der Betrag von Ihrer Summe abgezogen. Es verfällt nicht.",
    mod: "Ihre Bestellung {order} wurde wie gewünscht geändert: {change}.\n\nSonst ändert sich nichts an der Bestellung. Die Sendungsnummer erhalten Sie, sobald sie versandt ist.",
  },
  fr: {
    hi: "Bonjour {name},",
    refund:
      "Votre remboursement pour la commande {order} a été effectué. {amount} est en route vers le moyen de paiement que vous avez utilisé.\n\nSelon votre banque, comptez 3 à 5 jours ouvrés avant que le montant apparaisse sur votre relevé. Vous n'avez rien d'autre à faire.",
    cancel:
      "Votre commande {order} a été annulée, rien ne sera donc expédié. {amount} a été remboursé sur le moyen de paiement que vous avez utilisé.\n\nSelon votre banque, comptez 3 à 5 jours ouvrés avant que le montant apparaisse sur votre relevé.",
    repl: "Un article de remplacement pour la commande {order} vous est envoyé sans frais supplémentaires. Vous recevrez un nouveau numéro de suivi dès que le colis sera en route.",
    voucher:
      "Voici votre avoir pour la commande {order} : {code}, d'une valeur de {amount}.\n\nSaisissez-le au moment du paiement et le montant sera déduit de votre total. Il n'expire pas.",
    mod: "Votre commande {order} a été modifiée comme demandé : {change}.\n\nRien d'autre ne change. Vous recevrez le numéro de suivi dès l'expédition.",
  },
  es: {
    hi: "Hola {name}:",
    refund:
      "Tu reembolso del pedido {order} ya está hecho. {amount} está de vuelta hacia el método de pago que utilizaste.\n\nSegún tu banco, puede tardar de 3 a 5 días laborables en aparecer en tu extracto. No tienes que hacer nada más.",
    cancel:
      "Tu pedido {order} ha sido cancelado, así que no se enviará nada. Te hemos devuelto {amount} al método de pago que utilizaste.\n\nSegún tu banco, puede tardar de 3 a 5 días laborables en aparecer en tu extracto.",
    repl: "Un artículo de sustitución del pedido {order} va de camino sin coste adicional. Recibirás un nuevo número de seguimiento en cuanto el paquete se ponga en marcha.",
    voucher:
      "Aquí tienes tu saldo para el pedido {order}: {code}, por valor de {amount}.\n\nIntrodúcelo al finalizar la compra y el importe se descontará de tu total. No caduca.",
    mod: "Tu pedido {order} se ha modificado como pediste: {change}.\n\nNo cambia nada más del pedido. Recibirás el número de seguimiento en cuanto se envíe.",
  },
  it: {
    hi: "Ciao {name},",
    refund:
      "Il rimborso per l'ordine {order} è stato effettuato. {amount} sta tornando sul metodo di pagamento che hai usato.\n\nA seconda della banca possono servire dai 3 ai 5 giorni lavorativi prima che compaia sull'estratto conto. Non devi fare altro.",
    cancel:
      "Il tuo ordine {order} è stato annullato, quindi non verrà spedito nulla. Ti abbiamo rimborsato {amount} sul metodo di pagamento che hai usato.\n\nA seconda della banca possono servire dai 3 ai 5 giorni lavorativi prima che compaia sull'estratto conto.",
    repl: "Un articolo sostitutivo per l'ordine {order} è in viaggio verso di te senza costi aggiuntivi. Riceverai un nuovo numero di tracciamento appena il pacco sarà in movimento.",
    voucher:
      "Ecco il tuo credito per l'ordine {order}: {code}, del valore di {amount}.\n\nInseriscilo al momento del pagamento e l'importo verrà sottratto dal totale. Non ha scadenza.",
    mod: "Il tuo ordine {order} è stato modificato come richiesto: {change}.\n\nNient'altro cambia. Riceverai il numero di tracciamento appena verrà spedito.",
  },
  pt: {
    hi: "Olá {name},",
    refund:
      "O reembolso da encomenda {order} foi processado. {amount} está a caminho do método de pagamento que utilizou.\n\nConsoante o seu banco, pode demorar 3 a 5 dias úteis até aparecer no extrato. Não precisa de fazer mais nada.",
    cancel:
      "A sua encomenda {order} foi cancelada, pelo que nada será enviado. Devolvemos {amount} ao método de pagamento que utilizou.\n\nConsoante o seu banco, pode demorar 3 a 5 dias úteis até aparecer no extrato.",
    repl: "Um artigo de substituição da encomenda {order} segue a caminho sem custos adicionais. Receberá um novo número de seguimento assim que a encomenda estiver em trânsito.",
    voucher:
      "Aqui está o seu saldo para a encomenda {order}: {code}, no valor de {amount}.\n\nIntroduza-o na finalização da compra e o valor será descontado do total. Não expira.",
    mod: "A sua encomenda {order} foi alterada como pediu: {change}.\n\nNada mais muda na encomenda. Receberá o número de seguimento assim que for enviada.",
  },
  sv: {
    hi: "Hej {name},",
    refund:
      "Din återbetalning för order {order} är genomförd. {amount} är på väg tillbaka till det betalsätt du använde.\n\nBeroende på din bank kan det ta 3 till 5 bankdagar innan beloppet syns på kontoutdraget. Du behöver inte göra något mer.",
    cancel:
      "Din order {order} är avbruten, så ingenting kommer att skickas. Vi har återbetalat {amount} till det betalsätt du använde.\n\nBeroende på din bank kan det ta 3 till 5 bankdagar innan beloppet syns på kontoutdraget.",
    repl: "En ersättningsvara för order {order} är på väg till dig utan extra kostnad. Du får ett nytt spårningsnummer så snart paketet är i rörelse.",
    voucher:
      "Här är din tillgodosumma för order {order}: {code}, värd {amount}.\n\nAnge den i kassan så dras beloppet från din summa. Den har inget utgångsdatum.",
    mod: "Din order {order} är ändrad som du bad om: {change}.\n\nInget annat i ordern ändras. Du får spårningsnumret så snart den skickas.",
  },
  no: {
    hi: "Hei {name},",
    refund:
      "Refusjonen for ordre {order} er gjennomført. {amount} er på vei tilbake til betalingsmåten du brukte.\n\nAvhengig av banken din kan det ta 3 til 5 virkedager før beløpet vises på kontoutskriften. Du trenger ikke gjøre noe mer.",
    cancel:
      "Ordren din {order} er kansellert, så ingenting blir sendt. Vi har refundert {amount} til betalingsmåten du brukte.\n\nAvhengig av banken din kan det ta 3 til 5 virkedager før beløpet vises på kontoutskriften.",
    repl: "En erstatningsvare for ordre {order} er på vei til deg uten ekstra kostnad. Du får et nytt sporingsnummer så snart pakken er i bevegelse.",
    voucher:
      "Her er tilgodelappen din for ordre {order}: {code}, verdt {amount}.\n\nSkriv den inn i kassen, så trekkes beløpet fra totalen. Den utløper ikke.",
    mod: "Ordren din {order} er endret slik du ba om: {change}.\n\nIngenting annet i ordren endres. Du får sporingsnummeret så snart den sendes.",
  },
  da: {
    hi: "Hej {name},",
    refund:
      "Din refusion for ordre {order} er gennemført. {amount} er på vej tilbage til den betalingsmetode, du brugte.\n\nAfhængigt af din bank kan der gå 3 til 5 hverdage, før beløbet står på din kontoudskrift. Du skal ikke gøre yderligere.",
    cancel:
      "Din ordre {order} er annulleret, så der bliver ikke sendt noget. Vi har refunderet {amount} til den betalingsmetode, du brugte.\n\nAfhængigt af din bank kan der gå 3 til 5 hverdage, før beløbet står på din kontoudskrift.",
    repl: "En erstatningsvare for ordre {order} er på vej til dig uden ekstra omkostninger. Du får et nyt trackingnummer, så snart pakken er på vej.",
    voucher:
      "Her er dit tilgodebevis for ordre {order}: {code} til en værdi af {amount}.\n\nIndtast det ved betaling, så trækkes beløbet fra din total. Det udløber ikke.",
    mod: "Din ordre {order} er ændret, som du bad om: {change}.\n\nIntet andet i ordren ændres. Du får trackingnummeret, så snart den sendes.",
  },
  fi: {
    hi: "Hei {name},",
    refund:
      "Tilauksen {order} hyvitys on käsitelty. {amount} on matkalla takaisin käyttämällesi maksutavalle.\n\nPankista riippuen summan näkyminen tiliotteella voi kestää 3–5 arkipäivää. Sinun ei tarvitse tehdä muuta.",
    cancel:
      "Tilauksesi {order} on peruutettu, joten mitään ei lähetetä. Olemme hyvittäneet {amount} käyttämällesi maksutavalle.\n\nPankista riippuen summan näkyminen tiliotteella voi kestää 3–5 arkipäivää.",
    repl: "Korvaava tuote tilaukseen {order} on matkalla sinulle ilman lisäkuluja. Saat uuden seurantanumeron heti, kun paketti lähtee liikkeelle.",
    voucher:
      "Tässä on hyvityksesi tilaukselle {order}: {code}, arvoltaan {amount}.\n\nSyötä se kassalla, niin summa vähennetään loppusummasta. Se ei vanhene.",
    mod: "Tilaustasi {order} on muutettu pyyntösi mukaisesti: {change}.\n\nMuuhun tilaukseen ei tule muutoksia. Saat seurantanumeron heti, kun tilaus lähtee.",
  },
  pl: {
    hi: "Dzień dobry {name},",
    refund:
      "Zwrot za zamówienie {order} został zrealizowany. Kwota {amount} wraca na metodę płatności, z której korzystałeś.\n\nW zależności od banku może minąć od 3 do 5 dni roboczych, zanim pojawi się na wyciągu. Nie musisz nic więcej robić.",
    cancel:
      "Twoje zamówienie {order} zostało anulowane, więc nic nie zostanie wysłane. Zwróciliśmy {amount} na metodę płatności, z której korzystałeś.\n\nW zależności od banku może minąć od 3 do 5 dni roboczych, zanim kwota pojawi się na wyciągu.",
    repl: "Zamiennik do zamówienia {order} jest już w drodze, bez dodatkowych kosztów. Nowy numer śledzenia otrzymasz, gdy tylko paczka ruszy.",
    voucher:
      "Oto Twój bon do zamówienia {order}: {code} o wartości {amount}.\n\nWpisz go przy składaniu zamówienia, a kwota zostanie odliczona od sumy. Bon nie traci ważności.",
    mod: "Twoje zamówienie {order} zostało zmienione zgodnie z prośbą: {change}.\n\nNic więcej w zamówieniu się nie zmienia. Numer śledzenia otrzymasz zaraz po wysyłce.",
  },
};
