class CreateProfiles < ActiveRecord::Migration[8.1]
  def change
    create_table :profiles do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.date :date_of_birth
      t.string :gender
      t.string :relationship_kind, null: false
      t.text :medical_notes
      t.string :schedule_region, null: false, default: "IN"

      t.timestamps
    end

    add_index :profiles, [:user_id, :created_at]
  end
end
