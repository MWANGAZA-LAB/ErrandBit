# ErrandBit Fedi Mod Integration Guide

## Overview

ErrandBit is a **Fedi Mod** - a web application that runs natively within the Fedi app, providing seamless Lightning payments and privacy-preserving identity through WebLN and Nostr integration.

## What is a Fedi Mod?

A Fedi Mod is a web application that:
- Runs in Fedi's in-app browser
- Has WebLN automatically injected for Lightning payments
- Has Nostr automatically injected for identity (optional)
- Accesses user's Fedi ecash balance directly
- Provides instant, fee-free payments

## For Federation Guardians

### Adding ErrandBit to Your Federation

1. **Access Federation Configuration**
   - Open your federation's meta configuration
   - Locate the `sites` array

2. **Add ErrandBit Configuration**
   ```json
   {
     "sites": [
       {
         "id": "errandbit",
         "title": "ErrandBit - Local Services",
         "url": "https://errandbit.com",
         "description": "Trust-minimized local services marketplace",
         "icon": "https://errandbit.com/icon.png"
       }
     ]
   }
   ```

3. **Save Configuration**
   - ErrandBit will appear in the "Mods" tab for all federation members
   - Users can click to open and start using immediately

### Why Add ErrandBit to Your Federation?

**For Your Community:**
- Enables local service marketplace within your federation
- Members can hire each other for errands, deliveries, tasks
- Payments settle instantly from their Fedi balance
- No need to leave the app or set up external wallets

**For Economic Activity:**
- Drives Bitcoin circular economy within your community
- Creates local job opportunities
- Keeps value circulating in your federation
- Demonstrates real-world Bitcoin utility

**For Privacy:**
- Optional Nostr identity (no email/phone required)
- Ecash anonymity for payments
- No KYC or personal data collection
- Privacy-preserving by default

## For Developers

### Technical Architecture

```
┌─────────────────────────────────────┐
│         Fedi Mobile App             │
│  ┌──────────────────────────────┐  │
│  │   ErrandBit Mod (WebView)    │  │
│  │                               │  │
│  │  React + TypeScript + Vite    │  │
│  │  WebLN Integration            │  │
│  │  Nostr Integration            │  │
│  │                               │  │
│  │  window.webln  → Payments     │  │
│  │  window.nostr  → Identity     │  │
│  └──────────────────────────────┘  │
│                                     │
│  User's Fedimint Wallet             │
│  Ecash Balance                      │
└─────────────────────────────────────┘
```

### WebLN Integration

ErrandBit uses WebLN for all Lightning payments:

```typescript
// Initialize WebLN
await window.webln.enable();

// Send payment (client pays runner)
const result = await window.webln.sendPayment(invoice);
console.log('Payment successful:', result.preimage);

// Create invoice (runner receives payment)
const invoice = await window.webln.makeInvoice({
  amount: 50000, // 50,000 sats
  defaultMemo: 'Grocery delivery service'
});
```

### Nostr Integration

ErrandBit optionally uses Nostr for privacy-preserving identity:

```typescript
// Get user's public key (identity)
const pubkey = await window.nostr.getPublicKey();

// Sign authentication event
const authEvent = await window.nostr.signEvent({
  kind: 22242,
  content: '',
  tags: [['challenge', challengeString]]
});

// Encrypt direct messages
const encrypted = await window.nostr.nip04.encrypt(
  recipientPubkey,
  'Job details here'
);
```

### Payment Flow

1. **Client posts job** → Describes errand, sets price
2. **Runner accepts** → Agrees to complete task
3. **Runner completes job** → Provides proof/confirmation
4. **Client pays instantly** → One-click WebLN payment
5. **Payment settles** → Ecash → Lightning → Runner's wallet
6. **Review submitted** → Reputation updated

**No escrow needed!** Payments are instant and final.

### Environment Detection

ErrandBit automatically detects Fedi environment:

```typescript
// Check if running in Fedi
const isInFedi = typeof window.webln !== 'undefined';

// Graceful fallback for web browsers
if (!isInFedi) {
  // Show manual invoice entry
  // Or redirect to Fedi app
}
```

## Payment Economics

### Zero Platform Custody

ErrandBit **never holds funds**. All payments flow directly:
- Client's Fedi ecash → Lightning Network → Runner's wallet
- Platform fee (optional) collected via separate invoice
- No escrow, no custody, no regulatory risk

### Revenue Model

**Runner Subscriptions:**
- Free tier: 3 active jobs, basic features
- Pro tier: Unlimited jobs, priority placement
- Cost: 5,000 sats/month via WebLN autopay

**Boost Marketplace:**
- Featured placement: 10,000 sats/24 hours
- Top of search results
- Highlighted profile badge

**Per-Job Fee (Optional):**
- 500 sat platform fee per completed job
- Collected via second WebLN invoice
- Only charged on successful completion

### Example Transaction

```
Job: Grocery delivery
Agreed price: 50,000 sats

Payment flow:
1. Runner generates invoice: 50,000 sats
2. Client clicks "Pay" in ErrandBit
3. WebLN sends payment from Fedi balance
4. Platform fee invoice: 500 sats (optional)
5. Total: 50,500 sats from client's balance

Runner receives: 50,000 sats
Platform receives: 500 sats
Client pays: 50,500 sats total
```

## Deployment

### Production URL

```
https://errandbit.com
```

### Staging/Testing URL

```
https://staging.errandbit.com
```

### Local Development

```bash
# Clone repository
git clone https://github.com/MWANGAZA-LAB/ErrandBit.git
cd ErrandBit

# Install dependencies
npm run install:all

# Start development servers
.\start-dev.bat

# Access at http://localhost:5173
```

### Testing in Fedi

1. **Use Mutinynet** (Bitcoin testnet)
   - Free testnet sats
   - No real money required
   - Full Fedi functionality

2. **Configure Test Federation**
   ```json
   {
     "sites": [{
       "id": "errandbit-dev",
       "title": "ErrandBit (Dev)",
       "url": "http://localhost:5173"
     }]
   }
   ```

3. **Test WebLN Integration**
   - Create test job
   - Generate test invoice
   - Pay with Mutinynet sats
   - Verify payment flow

## Security Considerations

### Privacy

- **Nostr identity**: No email/phone required
- **Ecash payments**: Anonymous by default
- **No tracking**: No analytics or user profiling
- **End-to-end encryption**: Direct messages via NIP-04

### Trust Model

- **Reputation system**: On-chain reviews (future)
- **Progressive trust tiers**: Limit risk for new users
- **Dispute resolution**: Community-based mediation
- **No platform custody**: Zero counterparty risk

### Best Practices

- Always verify invoice amounts before paying
- Check runner reputation and reviews
- Use in-app chat for job coordination
- Report suspicious activity to federation guardians

## Support & Resources

### Documentation

- **Fedi Docs**: https://fedibtc.github.io/fedi-docs/
- **WebLN Spec**: https://webln.dev/
- **Nostr NIPs**: https://github.com/nostr-protocol/nips
- **ErrandBit Docs**: https://github.com/MWANGAZA-LAB/ErrandBit

### Community

- **Fedimint Discord**: https://discord.gg/fedimint
- **ErrandBit GitHub**: https://github.com/MWANGAZA-LAB/ErrandBit
- **Developer Calls**: Mondays 4PM UTC

### Contact

- **Email**: support@errandbit.com
- **GitHub Issues**: https://github.com/MWANGAZA-LAB/ErrandBit/issues
- **Twitter**: @ErrandBit

## Roadmap

### Phase 1: MVP (Current)
- ✅ WebLN payment integration
- ✅ Nostr identity support
- ✅ Basic job posting and matching
- ✅ In-app messaging
- ✅ Reputation system

### Phase 2: Enhanced Features (Q2 2025)
- [ ] Geospatial search with PostGIS
- [ ] Map integration (Mapbox)
- [ ] Real-time chat (Socket.io)
- [ ] Advanced filtering and matching
- [ ] Multi-federation support

### Phase 3: Custom Module (Q3 2025)
- [ ] Fedimint custom module
- [ ] On-chain reputation storage
- [ ] Smart contract escrow (optional)
- [ ] Federated job board
- [ ] Cross-federation payments

## License

Private - All rights reserved

Copyright (c) 2025 MWANGAZA-LAB
