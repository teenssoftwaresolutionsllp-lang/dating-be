declare module "swagger-ui-express" {
  import type { RequestHandler } from "express";

  export interface SwaggerUiOptions {
    [key: string]: any;
  }

  export const serve: RequestHandler[];
  export function setup(
    swaggerDoc?: any,
    opts?: SwaggerUiOptions | false | null,
    options?: SwaggerUiOptions,
    customCss?: string | false | null,
    customfavIcon?: string | false | null,
    swaggerUrl?: string | false | null,
    customSiteTitle?: string | false | null
  ): RequestHandler;

  const swaggerUi: {
    serve: RequestHandler[];
    setup: typeof setup;
  };

  export default swaggerUi;
}
