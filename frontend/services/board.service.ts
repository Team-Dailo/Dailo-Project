import axios from "axios";
import { API_BASE_URL } from "../constants/api";

const BOARD_PREFIX = "/posts";

export async function getPosts(params?: {
  categoryType?: string;
  sort?: string;
  page?: number;
  size?: number;
}) {
  const res = await axios.get(`${API_BASE_URL}${BOARD_PREFIX}`, { params });
  return res.data;
}

export async function getPostById(id: string) {
  const res = await axios.get(`${API_BASE_URL}${BOARD_PREFIX}/${id}`);
  return res.data;
}

export async function searchPosts(keyword: string, page = 0, size = 20) {
  const res = await axios.get(`${API_BASE_URL}${BOARD_PREFIX}/search`, {
    params: { keyword, page, size },
  });
  return res.data;
}

export async function getComments(postId: string) {
  const res = await axios.get(`${API_BASE_URL}${BOARD_PREFIX}/${postId}/comments`);
  return res.data;
}

export async function createPost(payload: any) {
  const res = await axios.post(`${API_BASE_URL}${BOARD_PREFIX}`, payload);
  return res.data;
}

export async function createComment(postId: string, payload: any) {
  const res = await axios.post(
    `${API_BASE_URL}${BOARD_PREFIX}/${postId}/comments`,
    payload
  );
  return res.data;
}

export async function uploadPostImage(uri: string) {
  const formData = new FormData();

  formData.append("file", {
    uri,
    name: "image.jpg",
    type: "image/jpeg",
  } as any);

  const res = await axios.post(
    `${API_BASE_URL}${BOARD_PREFIX}/images`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return res.data; // 보통 URL 반환
}

export async function updatePost(id: string, payload: any, authorId?: number) {
  const res = await axios.put(
    `${API_BASE_URL}${BOARD_PREFIX}/${id}`,
    payload,
    {
      params: authorId != null ? { authorId } : undefined,
    }
  );
  return res.data;
}