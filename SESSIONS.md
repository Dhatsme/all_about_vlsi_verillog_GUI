# Session Logs

Running log of work done each session.

---

## 2026-05-19

### Curriculum progress
- Marked **msv2 (Sequential Logic)** as ✅ done in `CLAUDE.md`
- Advanced curriculum cursor to **msv3** as next chapter to build

### Built msv3 — Arithmetic Circuits (pushed to `develop`)
Full 5-lesson chapter written and registered:
| Lesson | Topic | Tier | Key concept |
|---|---|---|---|
| L1 | Half Adder | T2 | XOR operator, multiple outputs |
| L2 | Full Adder | T3 | 3-input logic, majority-of-three |
| L3 | 4-bit Ripple Carry Adder | T3 | Module instantiation, internal `logic` signals |
| L4 | 2s Complement Subtractor | T4 | `~b + 1` identity, borrow flag |
| L5 | 8-bit ALU (portfolio) | T5 | `always_comb` + `unique case`, zero/overflow flags |

Files changed on `develop`:
- `static/lessons/modules/msv3.js` — new file
- `static/index.html` — added msv3 script tag

### Agent scheduling discussion
- Answered "can you fire the agent every hour" question
- Recommended on-merge trigger (develop → main approval fires next chapter build)
  over hourly cron (review is the bottleneck, not build speed)
- GitHub Actions + Claude API approach described but not implemented yet

### Infrastructure: Railway free trial expired
Site went down after 1-month free trial ended. Explored options:

| Option | Cost | Verdict |
|---|---|---|
| Railway Hobby plan | $5/month | Best — already configured, zero setup |
| Oracle Cloud Always Free (A1 Flex) | Free | A1 out of capacity in Indian regions |
| Oracle Cloud E2.1.Micro | Free | Works but 1 GB RAM — needs GitHub Actions workaround |
| Hetzner CX22 | €3.79/month | Best paid value when scaling |
| AWS/Azure free tier | Free → expensive | 12-month trial only, not permanent |
| New Railway account | Free | Against ToS, not sustainable |

Attempted Oracle Cloud Always Free setup:
- Created Oracle account
- Found Ampere A1 Flex shape
- Hit "Out of capacity" error in all Availability Domains (common in India regions)
- Navigated VCN/subnet creation to unblock the form

**Final decision: Pay Railway $5/month** — site already configured there,
zero debugging risk, ₹420/month is the right trade-off at this stage
before there are paying users.

### Dockerfile
- Temporarily modified to remove UVM warmup cache (would save ~700 MB image size)
- Reverted immediately on user request — no net change to Dockerfile
