class AddRemindersToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :phone_number, :string

    create_table :reminder_preferences do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.boolean :email_enabled, null: false, default: true
      t.boolean :sms_enabled, null: false, default: false
      t.integer :lead_days, null: false, default: 7
      t.boolean :overdue_enabled, null: false, default: true
      t.timestamps
    end

    create_table :reminder_deliveries do |t|
      t.references :user, null: false, foreign_key: true
      t.references :profile, null: false, foreign_key: true
      t.string :channel, null: false
      t.string :status, null: false
      t.string :schedule_key, null: false
      t.string :vaccine_name, null: false
      t.date :due_date, null: false
      t.string :kind, null: false
      t.datetime :sent_at, null: false
      t.text :error_message
      t.timestamps
    end

    add_index :reminder_deliveries, [:user_id, :profile_id, :channel, :schedule_key, :due_date, :kind, :sent_at], name: "index_reminder_deliveries_on_dedupe_fields"
  end
end
