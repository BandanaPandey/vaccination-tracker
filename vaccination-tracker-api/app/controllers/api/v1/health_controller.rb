module Api
  module V1
    class HealthController < ApplicationController
      def show
        render json: {
          status: "ok",
          service: "vaccination-tracker-api",
          version: "v1"
        }
      end
    end
  end
end
