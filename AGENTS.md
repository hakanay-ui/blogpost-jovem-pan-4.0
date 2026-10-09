# Architecture rules
- Audience analytics use database aggregation with administrator-only reads and a validated write-only visit RPC; this keeps visitor records private and avoids row-limit truncation.
- Public-page tracking lives in PublicLayout and stores only pathname, anonymous session ID, external referring hostname, and timestamp; this avoids collecting query strings or personal identifiers.
- Router owns a per-request QueryClient shared with the root provider; route loaders prime the same cache that page components subscribe to.