-- Blocs sons/voyages (D50) : image de fond par bloc, son uploadé par élément (alternative à un lien).

ALTER TABLE block ADD COLUMN background_asset_id uuid REFERENCES asset (id) ON DELETE SET NULL;

ALTER TABLE block_item ADD COLUMN sound_asset_id uuid REFERENCES asset (id) ON DELETE SET NULL;
