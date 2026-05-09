require "test_helper"

class ReminderDeliveryTest < ActiveSupport::TestCase
  test "validates supported channel status and kind" do
    user = User.create!(name: "Reminder Delivery", email: "delivery-model@example.com", password: "password123", password_confirmation: "password123")
    profile = user.profiles.create!(name: "Child", relationship_kind: "child", schedule_region: "IN")

    delivery = ReminderDelivery.new(user:, profile:, channel: "push", status: "queued", schedule_key: "mmr-1", vaccine_name: "MMR", due_date: Date.current, kind: "tomorrow", sent_at: Time.current)

    assert_not delivery.valid?
    assert_includes delivery.errors[:channel], "is not included in the list"
    assert_includes delivery.errors[:status], "is not included in the list"
    assert_includes delivery.errors[:kind], "is not included in the list"
  end
end
