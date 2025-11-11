# Civ Kit Integration Plan - ErrandBit Enhancement Roadmap

## Executive Summary

This document outlines how ErrandBit will integrate Civ Kit's proven trust and escrow mechanisms while maintaining our core differentiation: **mobile-first local services with instant UX**.

**Key Insight**: Civ Kit is building decentralized eBay. ErrandBit is building Lightning TaskRabbit. We serve different markets but can learn from their battle-tested escrow and reputation systems.

---

## Phase 1: Foundation (Weeks 1-2) - IMMEDIATE

### 1.1 Database Schema Enhancements

**Goal**: Add trust tier tracking and escrow metadata

```sql
-- Add to migrations/006_trust_tiers.sql

-- Trust tier tracking
ALTER TABLE runner_profiles ADD COLUMN trust_tier VARCHAR(20) DEFAULT 'NEW' CHECK (trust_tier IN ('NEW', 'ESTABLISHED', 'PRO'));
ALTER TABLE runner_profiles ADD COLUMN stake_amount_sats INTEGER DEFAULT 0;
ALTER TABLE runner_profiles ADD COLUMN jobs_completed INTEGER DEFAULT 0;
ALTER TABLE runner_profiles ADD COLUMN on_time_rate DECIMAL(5,2) DEFAULT 100.00;

-- Escrow metadata
CREATE TABLE escrow_transactions (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  escrow_type VARCHAR(20) NOT NULL CHECK (escrow_type IN ('DIRECT', 'TIMELOCK', 'HTLC')),
  amount_sats INTEGER NOT NULL,
  payment_hash VARCHAR(64), -- For HTLC
  preimage VARCHAR(64), -- Stored securely, revealed on completion
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'LOCKED', 'RELEASED', 'DISPUTED', 'REFUNDED')),
  locked_at TIMESTAMP,
  released_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reputation staking
CREATE TABLE reputation_stakes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount_sats INTEGER NOT NULL,
  staked_at TIMESTAMP DEFAULT NOW(),
  unlocked_at TIMESTAMP,
  slashed_amount INTEGER DEFAULT 0,
  slashed_reason TEXT
);

-- Dispute resolution
CREATE TABLE disputes (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  initiated_by INTEGER NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  evidence_urls TEXT[],
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED')),
  resolution TEXT,
  resolved_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_escrow_job_id ON escrow_transactions(job_id);
CREATE INDEX idx_escrow_status ON escrow_transactions(status);
CREATE INDEX idx_disputes_job_id ON disputes(job_id);
CREATE INDEX idx_reputation_stakes_user_id ON reputation_stakes(user_id);
```

**Implementation Steps**:
1. Create migration file
2. Run migration on development DB
3. Update TypeScript types in `backend/src/types/index.ts`
4. Add repository classes

---

### 1.2 Trust Tier Logic

**File**: `backend/src/services/trust/TrustTierService.ts`

```typescript
/**
 * Trust Tier Service
 * Implements progressive trust model inspired by Civ Kit
 */

export enum TrustTier {
  NEW = 'NEW',
  ESTABLISHED = 'ESTABLISHED',
  PRO = 'PRO'
}

export interface TrustRequirements {
  minJobs: number;
  minRating: number;
  maxJobValue: number; // USD cents
  stakeRequired: number; // sats
  escrowType: 'DIRECT' | 'TIMELOCK' | 'HTLC';
}

export const TRUST_TIER_CONFIG: Record<TrustTier, TrustRequirements> = {
  [TrustTier.NEW]: {
    minJobs: 0,
    minRating: 0,
    maxJobValue: 5000, // $50
    stakeRequired: 0,
    escrowType: 'TIMELOCK' // Always use escrow for new users
  },
  [TrustTier.ESTABLISHED]: {
    minJobs: 6,
    minRating: 4.5,
    maxJobValue: 20000, // $200
    stakeRequired: 0,
    escrowType: 'DIRECT' // Can use direct payment
  },
  [TrustTier.PRO]: {
    minJobs: 25,
    minRating: 4.7,
    maxJobValue: Infinity,
    stakeRequired: 100000, // 100k sats (~$30 at current prices)
    escrowType: 'DIRECT'
  }
};

export class TrustTierService {
  
  /**
   * Calculate runner's trust tier based on performance
   */
  async calculateTrustTier(userId: number): Promise<TrustTier> {
    const profile = await this.runnerRepo.findByUserId(userId);
    const stats = await this.jobRepo.getRunnerStats(userId);
    
    const {
      jobs_completed: jobsCompleted,
      avg_rating: avgRating,
      stake_amount_sats: stakeAmount
    } = profile;
    
    // PRO tier requires stake + performance
    const proReqs = TRUST_TIER_CONFIG[TrustTier.PRO];
    if (
      jobsCompleted >= proReqs.minJobs &&
      avgRating >= proReqs.minRating &&
      stakeAmount >= proReqs.stakeRequired
    ) {
      return TrustTier.PRO;
    }
    
    // ESTABLISHED tier
    const estReqs = TRUST_TIER_CONFIG[TrustTier.ESTABLISHED];
    if (
      jobsCompleted >= estReqs.minJobs &&
      avgRating >= estReqs.minRating
    ) {
      return TrustTier.ESTABLISHED;
    }
    
    // Default to NEW
    return TrustTier.NEW;
  }
  
  /**
   * Determine escrow type for a job based on runner tier and job value
   */
  determineEscrowType(
    runnerTier: TrustTier,
    jobValueCents: number
  ): 'DIRECT' | 'TIMELOCK' | 'HTLC' {
    
    // High-value jobs always use HTLC
    if (jobValueCents > 5000) { // > $50
      return 'HTLC';
    }
    
    // Medium-value jobs
    if (jobValueCents > 2000) { // $20-$50
      return runnerTier === TrustTier.PRO ? 'DIRECT' : 'TIMELOCK';
    }
    
    // Low-value jobs
    // Trusted runners can use direct payment
    return runnerTier === TrustTier.NEW ? 'TIMELOCK' : 'DIRECT';
  }
  
  /**
   * Validate if runner can accept job based on trust tier
   */
  async canAcceptJob(
    runnerId: number,
    jobValueCents: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    
    const tier = await this.calculateTrustTier(runnerId);
    const maxValue = TRUST_TIER_CONFIG[tier].maxJobValue;
    
    if (jobValueCents > maxValue) {
      return {
        allowed: false,
        reason: `Job value ($${jobValueCents/100}) exceeds ${tier} tier limit ($${maxValue/100}). Complete more jobs to upgrade your tier.`
      };
    }
    
    return { allowed: true };
  }
}
```

**Implementation Checklist**:
- [ ] Create TrustTierService class
- [ ] Add calculateTrustTier method
- [ ] Add determineEscrowType logic
- [ ] Add validation to job acceptance flow
- [ ] Add trust tier display in UI

---

### 1.3 Escrow Service (Simplified)

**File**: `backend/src/services/payment/EscrowService.ts`

```typescript
/**
 * Escrow Service - Civ Kit Inspired
 * Progressive escrow: DIRECT → TIMELOCK → HTLC
 */

import crypto from 'crypto';
import { LightningService } from './LightningService.js';

export type EscrowType = 'DIRECT' | 'TIMELOCK' | 'HTLC';

export interface EscrowConfig {
  type: EscrowType;
  amountSats: number;
  expiryHours: number;
  requiresProof: boolean;
}

export class EscrowService {
  
  /**
   * Create escrow for job based on type
   */
  async createEscrow(
    jobId: number,
    escrowType: EscrowType,
    amountSats: number
  ): Promise<any> {
    
    switch(escrowType) {
      case 'DIRECT':
        return this.createDirectPayment(jobId, amountSats);
      
      case 'TIMELOCK':
        return this.createTimelockEscrow(jobId, amountSats);
      
      case 'HTLC':
        return this.createHTLCEscrow(jobId, amountSats);
    }
  }
  
  /**
   * DIRECT: Simple Lightning invoice (trusted)
   */
  private async createDirectPayment(jobId: number, amountSats: number) {
    const runner = await this.getRunnerForJob(jobId);
    
    const invoice = await this.lightningService.createInvoice({
      amount: amountSats,
      memo: `ErrandBit Job #${jobId}`,
      destination: runner.lightning_address
    });
    
    await this.escrowRepo.create({
      jobId,
      escrowType: 'DIRECT',
      amountSats,
      status: 'PENDING'
    });
    
    return {
      type: 'DIRECT',
      invoice,
      message: 'Direct payment - funds sent immediately on completion'
    };
  }
  
  /**
   * TIMELOCK: 2-of-2 multisig with auto-release
   * (Simplified - full implementation requires Lightning channels)
   */
  private async createTimelockEscrow(jobId: number, amountSats: number) {
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // For MVP: Use hold invoice (simplified HTLC)
    const secret = crypto.randomBytes(32);
    const hash = crypto.createHash('sha256').update(secret).digest('hex');
    
    const holdInvoice = await this.lightningService.createHoldInvoice({
      amount: amountSats,
      hash,
      expiry: expiryTime,
      memo: `ErrandBit Escrow #${jobId}`
    });
    
    await this.escrowRepo.create({
      jobId,
      escrowType: 'TIMELOCK',
      amountSats,
      paymentHash: hash,
      preimage: secret.toString('hex'), // Stored securely
      expiresAt: expiryTime,
      status: 'LOCKED'
    });
    
    return {
      type: 'TIMELOCK',
      invoice: holdInvoice,
      expiryTime,
      message: 'Escrow will auto-release 24h after job completion unless disputed'
    };
  }
  
  /**
   * HTLC: Full proof-of-completion escrow (Civ Kit style)
   */
  private async createHTLCEscrow(jobId: number, amountSats: number) {
    const secret = crypto.randomBytes(32);
    const hash = crypto.createHash('sha256').update(secret).digest('hex');
    
    // Create HTLC invoice
    const htlcInvoice = await this.lightningService.createHTLC({
      amount: amountSats,
      paymentHash: hash,
      expiryBlocks: 144, // 24 hours
      memo: `ErrandBit HTLC Escrow #${jobId}`
    });
    
    await this.escrowRepo.create({
      jobId,
      escrowType: 'HTLC',
      amountSats,
      paymentHash: hash,
      preimage: secret.toString('hex'),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'LOCKED'
    });
    
    return {
      type: 'HTLC',
      invoice: htlcInvoice,
      paymentHash: hash,
      requiresProof: true,
      message: 'Funds locked in HTLC. Upload proof of completion to release payment.'
    };
  }
  
  /**
   * Release escrow after job completion
   */
  async releaseEscrow(
    jobId: number,
    proofOfCompletion?: {
      photos: string[];
      gpsCoordinates: { lat: number; lng: number };
      timestamp: Date;
    }
  ) {
    const escrow = await this.escrowRepo.findByJobId(jobId);
    
    if (escrow.escrowType === 'HTLC') {
      // Verify proof before releasing
      const valid = await this.verifyProof(jobId, proofOfCompletion);
      if (!valid) {
        throw new Error('Invalid proof of completion');
      }
    }
    
    // Settle the HTLC/hold invoice
    await this.lightningService.settleInvoice({
      paymentHash: escrow.paymentHash,
      preimage: escrow.preimage
    });
    
    await this.escrowRepo.update(escrow.id, {
      status: 'RELEASED',
      releasedAt: new Date()
    });
    
    return { success: true, message: 'Payment released to runner' };
  }
}
```

**Implementation Checklist**:
- [ ] Create EscrowService class
- [ ] Implement DIRECT payment (MVP)
- [ ] Implement TIMELOCK with hold invoices
- [ ] Plan HTLC implementation (Phase 2)
- [ ] Add proof-of-completion verification

---

## Phase 2: Nostr Integration (Weeks 3-4) - OPTIONAL IDENTITY

### 2.1 Nostr Identity Service

**File**: `backend/src/services/identity/NostrService.ts`

```typescript
/**
 * Nostr Identity Service
 * Optional cross-platform reputation via Nostr
 */

import { getPublicKey, nip19 } from 'nostr-tools';
import { SimplePool } from 'nostr-tools/pool';

export class NostrIdentityService {
  private pool: SimplePool;
  private relays = [
    'wss://relay.damus.io',
    'wss://relay.nostr.band',
    'wss://nos.lol'
  ];
  
  constructor() {
    this.pool = new SimplePool();
  }
  
  /**
   * Link Nostr npub to ErrandBit account
   */
  async linkNostrIdentity(
    userId: number,
    npub: string,
    signature?: string
  ): Promise<void> {
    
    // Decode npub to hex pubkey
    const { data: pubkey } = nip19.decode(npub);
    
    // Optional: Verify signature proves ownership
    if (signature) {
      const verified = await this.verifyNostrSignature(
        pubkey as string,
        signature,
        `ErrandBit User ${userId}`
      );
      
      if (!verified) {
        throw new Error('Invalid Nostr signature');
      }
    }
    
    // Update user record
    await this.userRepo.update(userId, {
      nostr_pubkey: pubkey as string
    });
    
    // Fetch cross-platform reputation
    await this.syncNostrReputation(userId, pubkey as string);
  }
  
  /**
   * Fetch reputation from other platforms via Nostr
   */
  async syncNostrReputation(userId: number, pubkey: string) {
    // Query for reputation events (custom kind)
    const events = await this.pool.list(this.relays, [{
      kinds: [30000], // Custom reputation kind
      authors: [pubkey]
    }]);
    
    // Parse reputation data
    const reputationData = events.map(event => ({
      platform: event.tags.find(t => t[0] === 'platform')?.[1],
      rating: parseFloat(event.tags.find(t => t[0] === 'rating')?.[1] || '0'),
      jobsCompleted: parseInt(event.tags.find(t => t[0] === 'jobs')?.[1] || '0'),
      timestamp: event.created_at
    }));
    
    // Store cross-platform reputation
    await this.reputationRepo.upsert({
      userId,
      nostrReputation: reputationData,
      lastSyncedAt: new Date()
    });
  }
}
```

### 2.2 Frontend Nostr Integration

**File**: `frontend/src/services/nostr.service.ts`

```typescript
/**
 * Nostr Client Service
 * Browser extension integration (Alby, nos2x)
 */

import { nip19 } from 'nostr-tools';

export class NostrService {
  
  /**
   * Check if user has Nostr extension installed
   */
  isNostrAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.nostr;
  }
  
  /**
   * Connect to user's Nostr account
   */
  async connect(): Promise<string> {
    if (!this.isNostrAvailable()) {
      throw new Error('No Nostr extension found. Install Alby or nos2x.');
    }
    
    const pubkey = await window.nostr.getPublicKey();
    const npub = nip19.npubEncode(pubkey);
    
    return npub;
  }
  
  /**
   * Sign message to prove ownership
   */
  async signMessage(message: string): Promise<string> {
    if (!this.isNostrAvailable()) {
      throw new Error('No Nostr extension found');
    }
    
    const signature = await window.nostr.signEvent({
      kind: 1,
      content: message,
      tags: [],
      created_at: Math.floor(Date.now() / 1000)
    });
    
    return signature.sig;
  }
  
  /**
   * Link Nostr to ErrandBit profile
   */
  async linkToProfile(): Promise<void> {
    const npub = await this.connect();
    const signature = await this.signMessage(
      `Link to ErrandBit account ${Date.now()}`
    );
    
    await api.updateProfile({
      nostr_pubkey: npub,
      nostr_signature: signature
    });
  }
}
```

**Implementation Checklist**:
- [ ] Add nostr-tools dependency
- [ ] Create NostrIdentityService
- [ ] Add "Link Nostr" button to profile page
- [ ] Show cross-platform reputation badge
- [ ] Add Nostr relay configuration

---

## Phase 3: Reputation Staking (Weeks 5-6) - PRO TIER

### 3.1 Staking Service

**File**: `backend/src/services/reputation/StakingService.ts`

```typescript
/**
 * Reputation Staking - Civ Kit Inspired
 * Pro runners stake sats as collateral
 */

export class StakingService {
  
  /**
   * Stake sats to unlock Pro tier
   */
  async createStake(
    userId: number,
    amountSats: number
  ): Promise<void> {
    
    const minStake = 100000; // 100k sats
    
    if (amountSats < minStake) {
      throw new Error(`Minimum stake is ${minStake} sats`);
    }
    
    // Create Lightning hold invoice for stake
    const secret = crypto.randomBytes(32);
    const hash = crypto.createHash('sha256').update(secret).digest('hex');
    
    const stakeInvoice = await this.lightningService.createHoldInvoice({
      amount: amountSats,
      hash,
      expiry: new Date('2099-12-31'), // Long-term hold
      memo: `ErrandBit Pro Tier Stake`
    });
    
    await this.stakeRepo.create({
      userId,
      amountSats,
      paymentHash: hash,
      preimage: secret.toString('hex'),
      stakedAt: new Date()
    });
    
    return {
      invoice: stakeInvoice,
      message: 'Pay invoice to stake and unlock Pro tier',
      unlockInfo: {
        maxJobValue: 'Unlimited',
        features: ['Direct payments', 'Premium support', 'Verified badge']
      }
    };
  }
  
  /**
   * Slash stake for bad behavior
   */
  async slashStake(
    userId: number,
    amountSats: number,
    reason: string
  ): Promise<void> {
    
    const stake = await this.stakeRepo.findByUserId(userId);
    
    if (!stake || stake.unlocked_at) {
      throw new Error('No active stake found');
    }
    
    // Record slashing
    await this.stakeRepo.update(stake.id, {
      slashedAmount: stake.slashed_amount + amountSats,
      slashedReason: reason
    });
    
    // Notify user
    await this.notificationService.send({
      userId,
      type: 'STAKE_SLASHED',
      message: `${amountSats} sats slashed from your stake. Reason: ${reason}`
    });
  }
  
  /**
   * Unlock stake (after minimum period)
   */
  async unlockStake(userId: number): Promise<void> {
    const stake = await this.stakeRepo.findByUserId(userId);
    const minStakePeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    const timeSinceStake = Date.now() - stake.stakedAt.getTime();
    
    if (timeSinceStake < minStakePeriod) {
      throw new Error('Minimum stake period is 30 days');
    }
    
    // Settle hold invoice to return funds
    const returnAmount = stake.amountSats - stake.slashedAmount;
    
    await this.lightningService.settleInvoice({
      paymentHash: stake.paymentHash,
      preimage: stake.preimage
    });
    
    await this.stakeRepo.update(stake.id, {
      unlockedAt: new Date()
    });
  }
}
```

**Implementation Checklist**:
- [ ] Create StakingService
- [ ] Add "Stake to Go Pro" flow
- [ ] Design slashing rules
- [ ] Add stake UI to profile
- [ ] Add Pro tier badge

---

## Phase 4: Dispute Resolution (Weeks 7-8) - SAFETY NET

### 4.1 Dispute Service

**File**: `backend/src/services/dispute/DisputeService.ts`

```typescript
/**
 * Dispute Resolution - KYP Oracle Pattern
 * MVP: Centralized admin resolution
 * Future: Federated oracle network
 */

export class DisputeService {
  
  /**
   * Open dispute on job
   */
  async openDispute(
    jobId: number,
    initiatedBy: number,
    reason: string,
    evidence: {
      photos: string[];
      description: string;
      gpsData?: { lat: number; lng: number };
    }
  ): Promise<void> {
    
    // Freeze escrow
    await this.escrowService.freezeEscrow(jobId);
    
    // Create dispute record
    const dispute = await this.disputeRepo.create({
      jobId,
      initiatedBy,
      reason,
      evidenceUrls: evidence.photos,
      status: 'OPEN'
    });
    
    // Notify both parties
    const job = await this.jobRepo.findById(jobId);
    await this.notifyParties(job, dispute);
    
    // Alert admins
    await this.notifyAdmins(dispute);
  }
  
  /**
   * Resolve dispute (admin action)
   */
  async resolveDispute(
    disputeId: number,
    resolution: {
      decision: 'REFUND_CLIENT' | 'PAY_RUNNER' | 'SPLIT_50_50';
      explanation: string;
      resolvedBy: number;
    }
  ): Promise<void> {
    
    const dispute = await this.disputeRepo.findById(disputeId);
    const job = await this.jobRepo.findById(dispute.jobId);
    const escrow = await this.escrowRepo.findByJobId(dispute.jobId);
    
    switch(resolution.decision) {
      case 'REFUND_CLIENT':
        await this.escrowService.refundClient(dispute.jobId);
        break;
        
      case 'PAY_RUNNER':
        await this.escrowService.releaseToRunner(dispute.jobId);
        break;
        
      case 'SPLIT_50_50':
        await this.escrowService.splitPayment(dispute.jobId, 50, 50);
        break;
    }
    
    await this.disputeRepo.update(disputeId, {
      status: 'RESOLVED',
      resolution: resolution.explanation,
      resolvedBy: resolution.resolvedBy,
      resolvedAt: new Date()
    });
  }
}
```

**Implementation Checklist**:
- [ ] Create DisputeService
- [ ] Add "Open Dispute" button to jobs
- [ ] Build admin dispute dashboard
- [ ] Add evidence upload (photos)
- [ ] Design resolution workflow

---

## Implementation Timeline

### Week 1-2: Foundation
- [x] Analyze Civ Kit research
- [ ] Database migrations for trust tiers
- [ ] TrustTierService implementation
- [ ] Basic escrow service (DIRECT + TIMELOCK)
- [ ] Update job acceptance flow with tier validation

### Week 3-4: Optional Nostr
- [ ] Install nostr-tools
- [ ] NostrIdentityService backend
- [ ] Nostr frontend integration
- [ ] "Link Nostr" profile UI
- [ ] Cross-platform reputation display

### Week 5-6: Pro Tier & Staking
- [ ] StakingService implementation
- [ ] "Stake to Go Pro" flow
- [ ] Pro tier badge design
- [ ] Slashing rules definition
- [ ] Stake unlock mechanism

### Week 7-8: Dispute Resolution
- [ ] DisputeService implementation
- [ ] Evidence upload system
- [ ] Admin dispute dashboard
- [ ] Resolution workflow
- [ ] Party notification system

### Week 9-10: Testing & Refinement
- [ ] End-to-end escrow testing
- [ ] Dispute simulation testing
- [ ] UI/UX refinement
- [ ] Performance optimization
- [ ] Documentation

---

## Key Differentiators vs Civ Kit

| Feature | Civ Kit | ErrandBit | Why Different? |
|---------|---------|-----------|----------------|
| **Market** | Global P2P trading | Local task economy | Different user needs |
| **UX** | Technical, desktop | Mobile-first, 3-tap | Onboarding speed |
| **Escrow** | Always HTLC | Tiered (DIRECT/TIMELOCK/HTLC) | Pragmatic trust |
| **Identity** | Nostr-only | Phone primary, Nostr optional | Mainstream adoption |
| **Discovery** | Nostr relays | PostGIS geo-matching | Location critical |
| **Onboarding** | Hours (technical) | Minutes (phone auth) | Conversion rate |

---

## Success Metrics

### Phase 1 (Trust Tiers)
- [ ] 90% of jobs under $20 use DIRECT payment
- [ ] NEW tier users complete 6+ jobs within 30 days
- [ ] ESTABLISHED tier reduces dispute rate by 50%

### Phase 2 (Nostr)
- [ ] 20% of Pro runners link Nostr
- [ ] Cross-platform reputation visible
- [ ] Nostr users show 15% higher ratings

### Phase 3 (Staking)
- [ ] 50 Pro runners stake within 60 days
- [ ] 0 slashing events (good behavior)
- [ ] Pro runners earn 2x normal runners

### Phase 4 (Disputes)
- [ ] <5% dispute rate overall
- [ ] 90% disputes resolved within 48h
- [ ] <2% escalation to admin

---

## Risk Mitigation

### Technical Risks
- **Lightning complexity**: Start with simple hold invoices, defer full HTLC
- **Nostr adoption**: Make it optional enhancement, not requirement
- **Staking lockup**: Use short minimum periods (30 days)

### Business Risks
- **Escrow delays**: DIRECT payment for trusted users
- **Dispute overhead**: Automated evidence review
- **User confusion**: Progressive disclosure, simple defaults

### Operational Risks
- **Admin burden**: Build self-service dispute tools
- **Fraud vectors**: Start with low limits, gradual trust
- **Liquidity**: Runner stakes are hold invoices, not custody

---

## Future: Full Decentralization (6-12 months)

### Federated KYP Oracles
- Multiple independent dispute resolvers
- Reputation-weighted voting
- Transparent resolution history

### DLC-Based Escrow
- Discreet Log Contracts for complex escrows
- No custodial risk
- Privacy-preserving proofs

### Fedi Mod Deployment
- Run as Fedimint module
- Community-owned infrastructure
- Censorship-resistant

---

## Conclusion

ErrandBit will strategically adopt Civ Kit's proven escrow and reputation mechanisms while maintaining our core advantage: **dead-simple mobile UX for local services**.

**Philosophy**: Start centralized, progressively decentralize. Optimize for adoption first, trustlessness later.

**Next Actions**:
1. Review this plan with team
2. Create Phase 1 database migrations
3. Begin TrustTierService implementation
4. Plan UI mockups for trust tiers

---

## References

- [Civ Kit White Paper](https://github.com/civkit/paper)
- [Lightning Dev Kit Docs](https://lightningdevkit.org/)
- [Nostr Protocol NIPs](https://github.com/nostr-protocol/nips)
- [Bitcoin DLCs](https://github.com/discreetlogcontracts/dlcspecs)
