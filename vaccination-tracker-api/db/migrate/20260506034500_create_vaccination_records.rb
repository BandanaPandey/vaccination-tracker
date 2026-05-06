class CreateVaccinationRecords < ActiveRecord::Migration[8.1]
  def change
    create_table :vaccination_records do |t|
      t.references :profile, null: false, foreign_key: true
      t.string :vaccine_name, null: false
      t.date :date_administered, null: false
      t.integer :dose_number
      t.string :provider
      t.text :notes

      t.timestamps
    end

    add_index :vaccination_records, [:profile_id, :date_administered, :created_at], name: "index_vaccination_records_on_profile_and_date"
  end
end
