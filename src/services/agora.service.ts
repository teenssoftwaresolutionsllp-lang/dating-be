import pkg from "agora-token";
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder } = pkg;

export class AgoraService {
  /**
   * Generates a dynamic RTM access token for real-time text chat signaling.
   * @param userId Unique user ID string
   * @param expireHours Token validity in hours (default 24 hours)
   */
  public static generateRtmToken(
    userId: string,
    expireHours: number = 24
  ): string {
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "⚠️ [AgoraService] AGORA_APP_ID or AGORA_APP_CERTIFICATE not configured in .env. Using development mock RTM token."
        );
        return `mock_rtm_token_${userId}_${Date.now()}`;
      }
      throw new Error(
        "AGORA_APP_ID and AGORA_APP_CERTIFICATE must be configured in .env"
      );
    }

    const expireTimestamp = Math.floor(Date.now() / 1000) + expireHours * 3600;

    return RtmTokenBuilder.buildToken(
      appId,
      appCertificate,
      userId,
      expireTimestamp
    );
  }
  /**
   * Generates a dynamic RTC access token for audio/video calling.
   * @param channelName Unique channel name (e.g. call_<uuid>)
   * @param uid Numeric user ID (1 to 4294967295) or 0 for dynamic assignment
   * @param expireHours Token validity in hours (default 2 hours)
   */
  public static generateRtcToken(
    channelName: string,
    uid: number = 0,
    expireHours: number = 2
  ): string {
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "⚠️ [AgoraService] AGORA_APP_ID or AGORA_APP_CERTIFICATE not configured in .env. Using development mock token."
        );
        return `mock_token_${channelName}_${uid}_${Date.now()}`;
      }
      throw new Error(
        "AGORA_APP_ID and AGORA_APP_CERTIFICATE must be configured in .env"
      );
    }

    const tokenExpireSeconds = expireHours * 3600;
    const privilegeExpireSeconds = expireHours * 3600;

    return RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      tokenExpireSeconds,
      privilegeExpireSeconds
    );
  }

  public static getAppId(): string {
    const appId = process.env.AGORA_APP_ID;
    if (!appId) {
      if (process.env.NODE_ENV !== "production") {
        return "dev_mock_agora_app_id";
      }
      throw new Error("AGORA_APP_ID must be configured in .env");
    }
    return appId;
  }
}
