-- AlterTable
ALTER TABLE `evaluation_details` ADD COLUMN `isRequired` BOOLEAN NOT NULL DEFAULT true;

-- Backfill snapshot from current criteria (safe if no evaluation history exists)
UPDATE `evaluation_details` `ed`
JOIN `quality_criteria` `qc` ON `qc`.`id` = `ed`.`criteriaId`
SET `ed`.`isRequired` = `qc`.`isRequired`;
