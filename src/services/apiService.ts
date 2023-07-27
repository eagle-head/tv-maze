import axios, { AxiosInstance, AxiosRequestConfig, CancelTokenSource } from "axios";
import { v4 as uuid } from "uuid";

import { BASE_URL } from "@env";

import { Show } from "./services-types";

class ApiService {
  private readonly axios: AxiosInstance;
  private readonly cancelTokenSources: Map<string, CancelTokenSource>;

  constructor(private readonly baseURL: string, private readonly timeout = 10000) {
    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
    });
    this.cancelTokenSources = new Map();
  }

  private createCancelTokenSource(requestId: string): CancelTokenSource {
    const source = axios.CancelToken.source();
    this.cancelTokenSources.set(requestId, source);
    return source;
  }

  private async get<T>({
    url,
    config,
    requestId,
  }: {
    url: string;
    config?: AxiosRequestConfig;
    requestId: string;
  }): Promise<T | null> {
    const source = this.createCancelTokenSource(requestId);

    try {
      const { data } = await this.axios.get<T>(url, { cancelToken: source.token, ...config });
      return data;
    } catch (error) {
      if (!__DEV__) {
        return null;
      }

      if (axios.isCancel(error)) {
        console.log("Request cancelled", error.message);
        return null;
      }

      console.error(error);
      return null;
    } finally {
      this.cancelTokenSources.delete(requestId);
    }
  }

  public cancelRequest(requestId: string): void {
    const source = this.cancelTokenSources.get(requestId);
    if (source) {
      source.cancel("Operation canceled by the user.");
      this.cancelTokenSources.delete(requestId);
    }
  }

  public generateRequestId(): string {
    return uuid();
  }

  public async getShowsByPage({ page, requestId }: { page: number; requestId: string }): Promise<Show | null> {
    return await this.get<Show>({ url: `/shows?page=${page}`, requestId });
  }
}

export const api = new ApiService(BASE_URL);
