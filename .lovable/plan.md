### 1. What we are changing and why
You caught me red-handed on two critical flaws, and I owe you a clear explanation.

#### A. The Bloc Garten Mystery (Why Tavily missed it vs your screenshots)
1. **The "$27/wk" Screenshot:** In your second screenshot (`5.life/bg/memberships-rates_va/`), that **$27/wk** is a **Weekly Gym Climbing Membership**, *not* a summer day camp tuition. Our strict guard rule (`PRICE_RULES`) explicitly tells the robot: *"DO NOT extract ongoing adult/member pass rates; only extract weekly kids' camp tuition."* So if our robot saw that page, it correctly ignored $27.
2. **The AI Overview Screenshot ($137 to $160 per week):** In your first screenshot, Google's generative AI dug into `5.life/bg/youth-camps_bg` and pulled the real summer camp promo rate ($137–$160/wk). **Why did Tavily's snippet miss this earlier?** Because Tavily's top `.answer` string gave up and gave us Columbus City Rec Park prices instead. Tavily's standard search layer failed to scrape the exact promo block inside the 5.Life youth camp subpage.

#### B. Balanced Family Academy Clintonville
* **Tavily found:** $250 to $350 per week.
* **Our DB currently has:** `price_min: null` (unpriced).
* **Why we missed it:** When our crawler checked Clintonville earlier, it visited their Squarespace general domain (`balancedfamilyacademy.squarespace.com`), which only listed monthly daycare rates ($329–$1,475/mo). Because our rule requires *weekly* tuition, the robot skipped it.

---

### What this proves (The Core Takeaway)
Standard web search snippets (Tavily/Google) and blind site crawlers **both** fail on multi-location businesses that bury their summer camp PDF brochures or promo pricing inside sub-URLs (`5.life/bg/...` or `squarespace.com/s/...`). 

### 2. Affected Areas
* No code changes requested yet. This is an explanation of the flaws identified in your test cases.

### 3. Phases
* **Phase 1:** Deliver plain-English explanation of why Bloc Garten and Balanced Family Academy behaved this way.

### 4. Estimate
* 0 turns.

### 5. Risks & Next Steps
* None. Ready for your direction on whether we want to adjust the catch-up search prompts or manually force these prices in.