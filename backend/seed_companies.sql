-- backend/seed_companies.sql
INSERT INTO companies (id, name, domain, board_token, source_platform, industry, is_active) VALUES
  (gen_random_uuid(), 'Figma', 'figma.com', 'figma', 'greenhouse', 'Design Software', true),
  (gen_random_uuid(), 'Stripe', 'stripe.com', 'stripe', 'greenhouse', 'Fintech', true),
  (gen_random_uuid(), 'Eventbrite', 'eventbrite.com', 'eventbrite', 'lever', 'Events', true),
  (gen_random_uuid(), 'Salesforce', 'salesforce.com', 'salesforce:1:External_Career_Site', 'workday', 'Enterprise Software', true)
ON CONFLICT (domain) DO UPDATE
  SET board_token = EXCLUDED.board_token,
      source_platform = EXCLUDED.source_platform,
      industry = EXCLUDED.industry,
      is_active = EXCLUDED.is_active;