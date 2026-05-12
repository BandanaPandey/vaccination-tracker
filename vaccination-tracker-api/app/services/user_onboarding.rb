class UserOnboarding
  class << self
    def create!(attributes)
      User.transaction do
        user = User.create!(attributes)
        ensure_default_profile!(user)
        user
      end
    end

    def ensure_default_profile!(user)
      return user if user.profiles.exists?

      user.profiles.create!(
        name: user.name,
        relationship_kind: "self",
        schedule_region: Profile::DEFAULT_SCHEDULE_REGION
      )

      user
    end
  end
end
