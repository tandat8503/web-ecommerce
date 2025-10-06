import axiosClient from "./axiosClient";

export async function getSpecifications(params) {
  return await axiosClient.get("admin/product-specifications", { params });
}

export async function getSpecificationById(id) {
  return await axiosClient.get(`admin/product-specifications/${id}`);
}

export async function createSpecification(data) {
  return await axiosClient.post("admin/product-specifications", data);
}

export async function updateSpecification(id, data) {
  return await axiosClient.put(`admin/product-specifications/${id}`, data);
}

export async function deleteSpecification(id) {
  return await axiosClient.delete(`admin/product-specifications/${id}`);
}
