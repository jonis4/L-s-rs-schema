---
description: Studenten föreslår, ingenjoren och formgivaren avgör. Kör hela rundan och ger en rekommendation.
argument-hint: [område i appen, eller en specifik idé]
---

Ämne: $ARGUMENTS

Kör stegen i ordning. Sammanfatta aldrig en agents svar åt nästa — skicka vidare
det den faktiskt skrev, ordagrant. Hela poängen är att de bemöter varandra och
inte din tolkning av varandra. Agenterna ser inte den här konversationen, så all
kontext de behöver måste stå i prompten du skickar: vad appen gör, var koden
ligger, vilka delar av gränssnittet som berörs.

**Steg 1 — uppslag.** Spawna `studenten`. Har användaren gett en färdig idé ska
studenten utveckla den och lägga fram tre till fyra närliggande varianter. Har
användaren bara gett ett område ska studenten leta friktion där och lämna fem
till åtta uppslag.

**Steg 2 — urval.** Visa studentens lista för användaren och fråga vilka som ska
gå vidare, om det är fler än tre. Är det tre eller färre, fortsätt direkt.

**Steg 3 — bedömning.** Spawna `ingenjoren` och `formgivaren` parallellt. Båda
får de valda uppslagen i studentens egen formulering.

**Steg 4 — replik.** Spawna båda igen. Var och en får motpartens fullständiga
utlåtande och ska: (a) namnge den starkaste invändningen mot sin egen position,
(b) säga vad den ändrar i sitt förslag på grund av den, (c) hålla fast vid det
den fortfarande tycker är rätt, med motivering.

**Steg 5 — kontroll.** Spawna `studenten` en sista gång med båda replikerna.
Enda frågan: löser det de landat i det problem du beskrev, eller har de löst
något annat? Kort svar.

**Steg 6 — din dom.** Skriv själv, kort:

- Vad de är överens om. Det här är oftast det verkliga svaret.
- Var de faktiskt är oense, och om oenigheten handlar om fakta eller om
  prioritering. Bara det senare är ditt att avgöra.
- Rekommendation: vad som byggs nu, vad som skalas bort, vad som väntar.
- Ett första steg som går att göra idag.

Två varningar du ska skriva ut om de slår in: om båda bedömarna landar i "bygg"
utan invändningar av vikt är förslaget för vagt för att kunna kritiseras. Och om
studentens uppslag mest var märkta som gissningar står hela rundan på lös grund
— säg det istället för att låtsas att något passerat en granskning.
