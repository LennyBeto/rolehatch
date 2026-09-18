-- backend/seed_companies.sql
INSERT INTO companies (id, name, domain, board_token, industry, is_active) VALUES
  (gen_random_uuid(), 'Figma', 'figma.com', 'figma', 'Design Software', true),
  (gen_random_uuid(), 'Stripe', 'stripe.com', 'stripe', 'Fintech', true),
  (gen_random_uuid(), 'Eventbrite', 'eventbrite.com', 'eventbrite', 'Events', true),
  (gen_random_uuid(), 'Salesforce', 'salesforce.com', 'salesforce:1:External_Career_Site', 'Enterprise Software', true);