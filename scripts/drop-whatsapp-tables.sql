-- One-off cleanup: run against production Postgres after deploying WhatsApp removal.
DROP TABLE IF EXISTS whatsapp_agent_state;
DROP TABLE IF EXISTS welcome_message_job;
DROP TABLE IF EXISTS whatsapp_read_state;
DROP TABLE IF EXISTS whatsapp_contact;
DROP TABLE IF EXISTS whatsapp_message;
