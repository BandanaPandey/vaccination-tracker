# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_05_09_093000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "auth_identities", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email"
    t.jsonb "metadata", default: {}, null: false
    t.string "provider", null: false
    t.string "uid", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["provider", "uid"], name: "index_auth_identities_on_provider_and_uid", unique: true
    t.index ["user_id"], name: "index_auth_identities_on_user_id"
  end

  create_table "profiles", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "date_of_birth"
    t.string "gender"
    t.text "medical_notes"
    t.string "name", null: false
    t.string "relationship_kind", null: false
    t.string "schedule_region", default: "IN", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id", "created_at"], name: "index_profiles_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_profiles_on_user_id"
  end

  create_table "reminder_deliveries", force: :cascade do |t|
    t.string "channel", null: false
    t.datetime "created_at", null: false
    t.date "due_date", null: false
    t.text "error_message"
    t.string "kind", null: false
    t.bigint "profile_id", null: false
    t.string "schedule_key", null: false
    t.datetime "sent_at", null: false
    t.string "status", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.string "vaccine_name", null: false
    t.index ["profile_id"], name: "index_reminder_deliveries_on_profile_id"
    t.index ["user_id", "profile_id", "channel", "schedule_key", "due_date", "kind", "sent_at"], name: "index_reminder_deliveries_on_dedupe_fields"
    t.index ["user_id"], name: "index_reminder_deliveries_on_user_id"
  end

  create_table "reminder_preferences", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "email_enabled", default: true, null: false
    t.integer "lead_days", default: 7, null: false
    t.boolean "overdue_enabled", default: true, null: false
    t.boolean "sms_enabled", default: false, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_reminder_preferences_on_user_id", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "name", null: false
    t.string "password_digest", null: false
    t.string "phone_number"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  create_table "vaccination_records", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "date_administered", null: false
    t.integer "dose_number"
    t.text "notes"
    t.bigint "profile_id", null: false
    t.string "provider"
    t.datetime "updated_at", null: false
    t.string "vaccine_name", null: false
    t.index ["profile_id", "date_administered", "created_at"], name: "index_vaccination_records_on_profile_and_date"
    t.index ["profile_id"], name: "index_vaccination_records_on_profile_id"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "auth_identities", "users"
  add_foreign_key "profiles", "users"
  add_foreign_key "reminder_deliveries", "profiles"
  add_foreign_key "reminder_deliveries", "users"
  add_foreign_key "reminder_preferences", "users"
  add_foreign_key "vaccination_records", "profiles"
end
