# Disaster recovery (outline)

## Objectives

- **RPO** (recovery point objective): define per environment; production typically 15–60 minutes for DB via automated backups.
- **RTO** (recovery time objective): time to restore API + workers; practice quarterly.

## Backups

- **Database**: automated snapshots (managed service preferred) + periodic logical dumps to object storage with encryption and IAM-scoped access.
- **Object storage** (uploads, logos, room images): versioning + cross-region replication if compliance requires it.
- **Secrets**: store in vault; rebuilding `.env` should not be the only recovery path.

## Failure scenarios

1. **Region loss**: failover to standby DB and redeploy app + workers in secondary region; update DNS and payment webhook URLs in Xendit dashboard.
2. **Data corruption**: restore DB from last clean snapshot; replay or reconcile payments using `payments:reconcile-booking-invoices` and Xendit dashboard.
3. **Queue backlog**: scale workers horizontally; investigate dead-letter / failed jobs.

## Communication

- Document on-call rotation, incident commander role, and customer comms templates (status page, email).

This file is a starter; fill in vendor-specific runbooks (AWS RDS, GCP Cloud SQL, etc.) for your hosting choice.
