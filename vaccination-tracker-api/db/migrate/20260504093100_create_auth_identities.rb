class CreateAuthIdentities < ActiveRecord::Migration[8.1]
  def change
    create_table :auth_identities do |t|
      t.references :user, null: false, foreign_key: true
      t.string :provider, null: false
      t.string :uid, null: false
      t.string :email
      t.jsonb :metadata, null: false, default: {}

      t.timestamps
    end

    add_index :auth_identities, %i[provider uid], unique: true
  end
end
