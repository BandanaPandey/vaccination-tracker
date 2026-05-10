Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      post "auth/signup", to: "auth#signup"
      post "auth/login", to: "auth#login"
      get "auth/me", to: "auth#me"
      delete "auth/logout", to: "auth#logout"
      get :dashboard, to: "dashboards#show"
      get :calendar, to: "calendars#show"
      get :reminder_preferences, to: "reminder_preferences#show"
      patch :reminder_preferences, to: "reminder_preferences#update"
      get :reminder_deliveries, to: "reminder_deliveries#index"
      post "reminders/run", to: "reminders#create"
      resources :profiles, only: %i[index show create update destroy] do
        member do
          get :schedule, to: "profile_schedules#show"
        end
        get :certificate, to: "certificates#show"
        resources :vaccination_records, only: %i[index show create update destroy]
      end
      get :health, to: "health#show"
    end
  end
end
