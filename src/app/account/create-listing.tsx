import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    fetchCategories,
    fetchCategoryAttributes,
    fetchChildCategories,
    fetchCities,
    fetchSubCategories,
} from "../../api/categories";
import {
  createListing,
  fetchMyListingDetail,
  updateListing,
} from "../../api/listings";
import { useAuth } from "../../hooks/useAuth";

type AttributeField = {
  key: string;
  label: string;
  type?: "select" | "radio" | "checkbox" | "text" | "number";
  options?: string[];
};

export default function CreateListingScreen() {
  const { editId: routeEditId } = useLocalSearchParams<{ editId?: string }>();
  const editId = Array.isArray(routeEditId) ? routeEditId[0] : routeEditId;
  const isEditMode = Boolean(editId);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Catalog state
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [childCategories, setChildCategories] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<
    number | null
  >(null);
  const [selectedChildCategoryId, setSelectedChildCategoryId] = useState<
    number | null
  >(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [selectedSubCategoryName, setSelectedSubCategoryName] = useState("");
  const [selectedChildCategoryName, setSelectedChildCategoryName] =
    useState("");
  const [selectedCategorySlug, setSelectedCategorySlug] = useState("");
  const [selectedSubCategorySlug, setSelectedSubCategorySlug] = useState("");
  // 'category' -> 'subcategory' -> 'childcategory' (if any) -> 'form'
  const [step, setStep] = useState<
    "category" | "subcategory" | "childcategory" | "form"
  >("category");
  const [loading, setLoading] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [loadingChildCategories, setLoadingChildCategories] = useState(false);
  const [catalogError, setCatalogError] = useState("");

  // Category dynamic attributes
  const [attributeFields, setAttributeFields] = useState<AttributeField[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, any>>(
    {},
  );
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [openOptionsKey, setOpenOptionsKey] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cityId, setCityId] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [price, setPrice] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // Media upload & submission state
  const [selectedImages, setSelectedImages] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [listingFeatures, setListingFeatures] = useState<any[]>([]);
  const [editingListing, setEditingListing] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editId) {
      router.replace({
        pathname: "/account/edit-listing/[id]",
        params: { id: String(editId) },
      });
      return;
    }
    loadCatalogData();
  }, [editId]);

  async function loadCatalogData() {
    setCatalogError("");
    setLoading(true);
    try {
      const [categoryData, cityData] = await Promise.all([
        fetchCategories(),
        fetchCities(),
      ]);
      const cats = categoryData || [];
      setCategories(cats);
      setCities(cityData || []);

      if (cats.length > 0 && !editId) {
        setSelectedCategoryId(Number(cats[0].id));
        setSelectedCategoryName(cats[0].name || "");
        setSelectedCategorySlug(cats[0].slug || "");
      }

      // Collect all subcategories across categories so main categories don't need to be chosen
      const subCategoryPromises = cats.map(async (cat: any) => {
        let subs = Array.isArray(cat?.sub_categories) ? cat.sub_categories : [];
        if (subs.length === 0) {
          try {
            subs = await fetchSubCategories(cat.id);
          } catch {
            subs = [];
          }
        }
        return (subs || []).map((sub: any) => ({
          ...sub,
          category_id: sub.category_id || cat.id,
          category_name: cat.name,
          category_slug: cat.slug,
        }));
      });

      const subResults = await Promise.all(subCategoryPromises);
      const flatSubs = subResults.flat();

      const seen = new Set();
      const uniqueSubs = flatSubs.filter((item: any) => {
        if (!item?.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      setSubCategories(uniqueSubs);

      if (editId) {
        const detail = await fetchMyListingDetail(editId);
        if (!detail) throw new Error("Listing not found or unavailable.");

        const categoryId = String(detail.category?.id ?? detail.category_id ?? "");
        const category = cats.find((item: any) => String(item.id) === categoryId);
        const subCategoryId = String(
          detail.sub_category?.id ?? detail.sub_category_id ?? "",
        );
        const subCategory = uniqueSubs.find(
          (item: any) => String(item.id) === subCategoryId,
        );
        const attributes = Array.isArray(detail.attributes)
          ? Object.fromEntries(
              detail.attributes.map((attribute: any) => [
                attribute.key,
                attribute.value,
              ]),
            )
          : {};
        const features = Array.isArray(detail.features) ? detail.features : [];

        setEditingListing(detail);
        setTitle(detail.title || "");
        setDescription(detail.description || "");
        setCityId(String(detail.city?.id ?? detail.city_id ?? ""));
        setMetaDescription(detail.seo_description || "");
        setPrice(String(detail.regular_price ?? ""));
        setPhone(detail.phone || detail.agent?.phone || "");
        setWhatsappNumber(detail.custom_fields?.whatsapp_number || "");
        setSelectedCategoryId(categoryId ? Number(categoryId) : null);
        setSelectedCategoryName(detail.category?.name || category?.name || "");
        setSelectedCategorySlug(detail.category?.slug || category?.slug || "");
        setSelectedSubCategoryId(subCategoryId ? Number(subCategoryId) : null);
        setSelectedSubCategoryName(
          detail.sub_category?.name || subCategory?.name || "",
        );
        setSelectedSubCategorySlug(subCategory?.slug || "");
        setSelectedChildCategoryId(
          detail.child_category_id ? Number(detail.child_category_id) : null,
        );
        setSelectedChildCategoryName(detail.child_category?.name || "");
        setAttributeValues(attributes);
        setListingFeatures(features);
        setExistingImages([
          ...(detail.thumb_image_url
            ? [{ id: "cover", uri: detail.thumb_image_url, cover: true }]
            : []),
          ...(detail.galleries || [])
            .filter((gallery: any) => gallery.image_url)
            .map((gallery: any) => ({
              id: gallery.id,
              uri: gallery.image_url,
              cover: false,
            })),
        ]);
        setStep("form");
      } else {
        setEditingListing(null);
        setExistingImages([]);
        setListingFeatures([]);
      }
    } catch (error: any) {
      setCatalogError(
        error?.message || "Unable to load categories and cities.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAttributes(categorySlug: string, subCategorySlug: string) {
    if (!categorySlug) return;
    try {
      setLoadingAttributes(true);
      const fields = await fetchCategoryAttributes(
        categorySlug,
        subCategorySlug,
      );
      setAttributeFields(fields || []);
    } catch (error: any) {
      console.warn("Failed to load category attributes", error);
      setAttributeFields([]);
    } finally {
      setLoadingAttributes(false);
    }
  }

  async function handleCategorySelect(category: any) {
    const catId = Number(category?.id);
    const catSlug = String(category?.slug || "");
    setSelectedCategoryId(catId);
    setSelectedCategoryName(category?.name || "Selected category");
    setSelectedCategorySlug(catSlug);
    setSelectedSubCategoryId(null);
    setSelectedSubCategoryName("");
    setSelectedSubCategorySlug("");
    setSelectedChildCategoryId(null);
    setSelectedChildCategoryName("");
    setAttributeValues({});
    setAttributeFields([]);
    setChildCategories([]);
    setLoadingSubcategories(true);
    try {
      const fetched = await fetchSubCategories(catId);
      setSubCategories(fetched || []);
      if (!fetched || fetched.length === 0) {
        await loadAttributes(catSlug, "");
      }
    } catch (error) {
      console.warn("Failed to load subcategories", error);
      setSubCategories([]);
    } finally {
      setLoadingSubcategories(false);
    }
  }

  async function handleSubCategorySelect(item: any) {
    const slug = String(item.slug || "");
    const parentCat =
      categories.find((c: any) => Number(c.id) === Number(item.category_id)) ||
      categories[0];
    const catId = parentCat
      ? Number(parentCat.id)
      : Number(item.category_id || 1);
    const catName = parentCat
      ? parentCat.name
      : item.category_name || "Classified";
    const catSlug = parentCat
      ? parentCat.slug
      : item.category_slug || "classified";

    setSelectedCategoryId(catId);
    setSelectedCategoryName(catName);
    setSelectedCategorySlug(catSlug);

    setSelectedSubCategoryId(Number(item.id));
    setSelectedSubCategoryName(item.name || catName);
    setSelectedSubCategorySlug(slug);
    setSelectedChildCategoryId(null);
    setSelectedChildCategoryName("");
    setChildCategories([]);

    setLoadingChildCategories(true);
    try {
      const fetched = await fetchChildCategories(item.id);
      setChildCategories(fetched || []);
      if (!fetched || fetched.length === 0) {
        // No child categories for this subcategory — go straight to the form.
        await loadAttributes(catSlug, slug);
        setStep("form");
      } else {
        setStep("childcategory");
      }
    } catch (error) {
      console.warn("Failed to load child categories", error);
      setChildCategories([]);
      await loadAttributes(catSlug, slug);
      setStep("form");
    } finally {
      setLoadingChildCategories(false);
    }
  }

  async function handleChildCategorySelect(child: any) {
    setSelectedChildCategoryId(Number(child.id));
    setSelectedChildCategoryName(child.name || child.slug);
    await loadAttributes(selectedCategorySlug, selectedSubCategorySlug);
    setStep("form");
  }

  async function continueWithoutChildCategory() {
    setSelectedChildCategoryId(null);
    setSelectedChildCategoryName("");
    await loadAttributes(selectedCategorySlug, selectedSubCategorySlug);
    setStep("form");
  }

  function chooseCategoryAndContinue() {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(Number(categories[0].id));
      setSelectedCategoryName(categories[0].name || "");
      setSelectedCategorySlug(categories[0].slug || "");
    }
    setStep("form");
  }

  function updateAttributeValue(key: string, value: any) {
    setAttributeValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCheckboxValue(key: string, option: string) {
    const current = Array.isArray(attributeValues[key])
      ? [...attributeValues[key]]
      : [];
    const exists = current.includes(option);
    const next = exists
      ? current.filter((item) => item !== option)
      : [...current, option];
    updateAttributeValue(key, next);
  }

  async function pickImages() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photos to upload images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.85,
    });

    if (result.canceled) {
      return;
    }

    setSelectedImages(result.assets || []);
  }

  async function toUploadFile(asset: ImagePicker.ImagePickerAsset) {
    const rawUri = asset.uri || "";
    const cleanUri = rawUri.split("?")[0];
    const ext = cleanUri.split(".").pop()?.toLowerCase() || "jpg";
    const cleanExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    const mimeType =
      asset.mimeType ||
      (cleanExt === "png"
        ? "image/png"
        : cleanExt === "webp"
          ? "image/webp"
          : "image/jpeg");
    const fileName =
      asset.fileName ||
      `upload-${Date.now()}-${Math.floor(Math.random() * 1000)}.${cleanExt}`;

    if (Platform.OS === "web") {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      return new File([blob], fileName, { type: mimeType });
    }

    return {
      uri: asset.uri,
      name: fileName,
      type: mimeType,
    } as any;
  }

  async function submit() {
    if (!isAuthenticated) {
      Alert.alert(
        "Login Required",
        "You must be logged in to publish a listing. Please log in to continue.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Log In", onPress: () => router.push("/login") },
        ],
      );
      return;
    }

    const finalCategoryId = Number(selectedCategoryId || 0);
    const finalSubCategoryId = Number(selectedSubCategoryId || 0);
    const finalChildCategoryId = Number(selectedChildCategoryId || 0);
    const cityIdValue = String(cityId || "").trim();

    const missing: string[] = [];
    if (!title.trim()) missing.push("Title");
    if (!description.trim()) missing.push("Description");
    if (!cityIdValue) missing.push("Location (City)");
    if (!price.trim()) missing.push("Price");
    if (!phone.trim()) missing.push("Mobile Phone Number");
    if (!finalCategoryId) missing.push("Category");

    if (missing.length > 0) {
      Alert.alert("Missing details", `Please fill in: ${missing.join(", ")}.`);
      return;
    }

    if (!isEditMode && selectedImages.length === 0) {
      Alert.alert(
        "Image required",
        "Please select at least one photo for the listing.",
      );
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      form.append("description", description.trim());
      form.append("city_id", cityIdValue);

      const matchedCity = cities.find(
        (c) => String(c.id) === String(cityIdValue),
      );
      const countryId = matchedCity?.country_id || editingListing?.country_id;
      if (countryId) {
        form.append("country_id", String(countryId));
      }

      if (metaDescription.trim()) {
        form.append("seo_description", metaDescription.trim());
        form.append("meta_description", metaDescription.trim());
      }

      form.append("regular_price", price.trim());
      form.append("phone", phone.trim());
      form.append("contact_phone", phone.trim());

      if (whatsappNumber.trim()) {
        form.append("whatsapp_number", whatsappNumber.trim());
        form.append("custom_fields[whatsapp_number]", whatsappNumber.trim());
      }

      Object.entries(attributeValues).forEach(([fieldKey, fieldValue]) => {
        if (Array.isArray(fieldValue)) {
          fieldValue.forEach((val) => {
            form.append(`custom_fields[${fieldKey}][]`, val);
          });
        } else if (
          fieldValue !== undefined &&
          fieldValue !== null &&
          fieldValue !== ""
        ) {
          form.append(`custom_fields[${fieldKey}]`, String(fieldValue));
        }
      });

      form.append("category_id", String(finalCategoryId));
      if (finalSubCategoryId) {
        form.append("sub_category_id", String(finalSubCategoryId));
      } else if (isEditMode) {
        form.append("sub_category_id", "");
      }
      if (finalChildCategoryId) {
        form.append("child_category_id", String(finalChildCategoryId));
      } else if (isEditMode) {
        form.append("child_category_id", "");
      }
      listingFeatures.forEach((feature: any) => {
        const featureId = typeof feature === "object" ? feature.id : feature;
        if (featureId) form.append("features[]", String(featureId));
      });

      const [primaryImage] = selectedImages;
      if (primaryImage) {
        form.append("thumb_image", await toUploadFile(primaryImage));
      }

      for (const asset of selectedImages.slice(1)) {
        form.append("gallery[]", await toUploadFile(asset));
      }

      if (isEditMode && editId) {
        await updateListing(editId, form);
        router.replace("/account/my-listings");
      } else {
        const response = await createListing(form);
        const listing = response?.data || null;
        resetForm();
        router.replace({
          pathname: "/account/listing-success",
          params: {
            id: listing?.id ? String(listing.id) : "",
            title: listing?.title || title.trim(),
          },
        });
      }
    } catch (error: any) {
      const serverErrors = error?.response?.data?.errors || error?.errors;
      const fieldErrors = serverErrors
        ? Object.values(serverErrors).flat().join("\n")
        : "";
      Alert.alert(
        "Could not create listing",
        fieldErrors || error?.message || "Please check the form and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setCityId("");
    setMetaDescription("");
    setPrice("");
    setPhone("");
    setWhatsappNumber("");
    setAttributeValues({});
    setAttributeFields([]);
    setSelectedImages([]);
    setSelectedCategoryId(null);
    setSelectedSubCategoryId(null);
    setSelectedChildCategoryId(null);
    setSelectedCategoryName("");
    setSelectedSubCategoryName("");
    setSelectedChildCategoryName("");
    setSelectedCategorySlug("");
    setSelectedSubCategorySlug("");
    setSubCategories([]);
    setChildCategories([]);
  }

  const selectedCategoryText = selectedChildCategoryName
    ? `${selectedSubCategoryName} > ${selectedChildCategoryName}`
    : selectedSubCategoryName || selectedCategoryName || "Not selected";

  const renderAttributeField = (field: AttributeField) => {
    const fieldValue = attributeValues[field.key] ?? "";

    if (field.type === "select") {
      const options = field.options || [];
      const labelText =
        typeof fieldValue === "string" && fieldValue ? fieldValue : "Select";

      return (
        <View key={field.key} style={styles.formGroup}>
          <Text style={styles.label}>{field.label}</Text>
          <Pressable
            onPress={() =>
              setOpenOptionsKey(openOptionsKey === field.key ? null : field.key)
            }
            style={styles.dropdownButton}
          >
            <Text
              style={[
                styles.dropdownText,
                !fieldValue && styles.placeholderText,
              ]}
            >
              {labelText}
            </Text>
            <Text style={styles.dropdownArrow}>▾</Text>
          </Pressable>
          {openOptionsKey === field.key && (
            <View style={styles.optionList}>
              {options.map((option: string) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    updateAttributeValue(field.key, option);
                    setOpenOptionsKey(null);
                  }}
                  style={styles.optionItem}
                >
                  <Text
                    style={[
                      styles.optionText,
                      fieldValue === option && styles.optionTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      );
    }

    if (field.type === "radio") {
      return (
        <View key={field.key} style={styles.formGroup}>
          <Text style={styles.label}>{field.label}</Text>
          <View style={styles.chipGrid}>
            {(field.options || []).map((option: string) => {
              const checked = fieldValue === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => updateAttributeValue(field.key, option)}
                  style={[styles.chip, checked && styles.chipSelected]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      checked && styles.chipTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    if (field.type === "checkbox") {
      const selected = Array.isArray(fieldValue) ? fieldValue : [];
      return (
        <View key={field.key} style={styles.formGroup}>
          <Text style={styles.label}>{field.label}</Text>
          <View style={styles.chipGrid}>
            {(field.options || []).map((option: string) => {
              const checked = selected.includes(option);
              return (
                <Pressable
                  key={option}
                  onPress={() => toggleCheckboxValue(field.key, option)}
                  style={[styles.chip, checked && styles.chipSelected]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      checked && styles.chipTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <View key={field.key} style={styles.formGroup}>
        <Text style={styles.label}>{field.label}</Text>
        <TextInput
          style={styles.input}
          placeholder={`Enter ${field.label.toLowerCase()}`}
          placeholderTextColor="#94a3b8"
          value={
            typeof fieldValue === "string" || typeof fieldValue === "number"
              ? String(fieldValue)
              : ""
          }
          onChangeText={(text) => updateAttributeValue(field.key, text)}
          keyboardType={field.type === "number" ? "numeric" : "default"}
        />
      </View>
    );
  };

  // Step 1: Subcategory Selection (Main categories hidden as requested)
  if (step === "category") {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable
          onPress={() => router.replace("/dashboard")}
          style={styles.topBackBtn}
        >
          <Text style={styles.backText}>← Back to Dashboard</Text>
        </Pressable>

        <Text style={styles.pageHeading}>Choose a Category</Text>
        <Text style={styles.pageSubheading}>
          Select the appropriate subcategory for your listing
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#1d4ed8"
            style={styles.loader}
          />
        ) : catalogError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{catalogError}</Text>
            <Pressable onPress={loadCatalogData} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.subCategoryPanel}>
            <Text style={styles.subCategoryHeader}>Select Subcategory</Text>

            {subCategories.length > 0 ? (
              <>
                {subCategories.map((item: any) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSubCategorySelect(item)}
                    style={styles.subCategoryItem}
                  >
                    <Text style={styles.subCategoryText}>{item.name}</Text>
                    {loadingChildCategories &&
                    Number(selectedSubCategoryId) === Number(item.id) ? (
                      <ActivityIndicator size="small" color="#1d4ed8" />
                    ) : (
                      <Text style={styles.categoryArrow}>›</Text>
                    )}
                  </Pressable>
                ))}

                <Pressable
                  onPress={async () => {
                    const defaultCat = categories[0] || {
                      id: 1,
                      name: "Classified",
                      slug: "classified",
                    };
                    setSelectedCategoryId(Number(defaultCat.id));
                    setSelectedCategoryName(defaultCat.name);
                    setSelectedCategorySlug(defaultCat.slug);
                    setSelectedSubCategoryId(null);
                    setSelectedSubCategoryName("");
                    setSelectedSubCategorySlug("");
                    await loadAttributes(defaultCat.slug, "");
                    chooseCategoryAndContinue();
                  }}
                  style={styles.continueCard}
                >
                  <Text style={styles.continueLabel}>
                    Continue without subcategory
                  </Text>
                  <Text style={styles.continueHint}>
                    Subcategory is optional
                  </Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.emptyText}>No subcategories available.</Text>
            )}
          </View>
        )}
      </ScrollView>
    );
  }

  // Step 2: Child Category Selection (only shown when the chosen subcategory
  // actually has child categories)
  if (step === "childcategory") {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable
          onPress={() => setStep("category")}
          style={styles.topBackBtn}
        >
          <Text style={styles.backText}>← Change Subcategory</Text>
        </Pressable>

        <Text style={styles.pageHeading}>Choose a Child Category</Text>
        <Text style={styles.pageSubheading}>
          Under "{selectedSubCategoryName}"
        </Text>

        <View style={styles.categoryList}>
          {childCategories.map((child: any) => (
            <Pressable
              key={child.id}
              onPress={() => handleChildCategorySelect(child)}
              style={styles.subCategoryItem}
            >
              <Text style={styles.subCategoryText}>{child.name}</Text>
              <Text style={styles.categoryArrow}>›</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={continueWithoutChildCategory}
            style={styles.continueCard}
          >
            <Text style={styles.continueLabel}>
              Continue without child category
            </Text>
            <Text style={styles.continueHint}>Child category is optional</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // Step 3: Form with Category Attributes + Clean 7 Fields
  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => setStep("category")}>
            <Text style={styles.backText}>← Change Subcategory</Text>
          </Pressable>
          <Text style={styles.headerTag}>
            {isEditMode ? "Edit Classified Listing" : "Create Listing"}
          </Text>
        </View>

        <Text style={styles.pageHeading}>
          {isEditMode ? "Edit Classified Listing" : "Post a New Listing"}
        </Text>

        {/* Selected Category Summary Card */}
        <View style={styles.categoryBadgeCard}>
          <View style={styles.categoryBadgeLeft}>
            <Text style={styles.categoryBadgeLabel}>Selected Subcategory</Text>
            <Text style={styles.categoryBadgeValue}>
              {selectedCategoryText}
            </Text>
          </View>
          <Pressable
            onPress={() => setStep("category")}
            style={styles.changeCategoryBtn}
          >
            <Text style={styles.changeCategoryText}>Change</Text>
          </Pressable>
        </View>

        {/* Photos Upload */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isEditMode ? "Listing Photos" : "Listing Photos *"}
          </Text>
          {isEditMode && existingImages.length > 0 ? (
            <>
              <Text style={styles.fieldHint}>Current images</Text>
              <View style={styles.previewRow}>
                {existingImages.map((image) => (
                  <View key={image.id} style={styles.previewWrapper}>
                    <Image
                      source={{ uri: image.uri }}
                      style={styles.previewImage}
                    />
                    {image.cover ? (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>Cover</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </>
          ) : null}
          <Pressable style={styles.uploadBox} onPress={pickImages}>
            <Text style={styles.uploadIcon}>📷</Text>
            <Text style={styles.uploadMainText}>
              {selectedImages.length > 0
                ? `${selectedImages.length} photo(s) selected`
                : isEditMode
                  ? "Select replacement or additional photos"
                  : "Tap to select photos from gallery"}
            </Text>
            <Text style={styles.uploadSubText}>
              {isEditMode
                ? "Leave empty to keep current images"
                : "First photo will be the cover image"}
            </Text>
          </Pressable>

          {selectedImages.length > 0 && (
            <View style={styles.previewRow}>
              {selectedImages.map((image, index) => (
                <View
                  key={`${image.uri}-${index}`}
                  style={styles.previewWrapper}
                >
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.previewImage}
                  />
                  {index === 0 && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Cover</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Category Dynamic Attributes */}
        {(loadingAttributes || attributeFields.length > 0) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Category Attributes</Text>
            {loadingAttributes ? (
              <ActivityIndicator
                size="small"
                color="#1d4ed8"
                style={styles.loader}
              />
            ) : (
              attributeFields.map(renderAttributeField)
            )}
          </View>
        )}

        {isEditMode && listingFeatures.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Features</Text>
            <Text style={styles.fieldHint}>
              {listingFeatures
                .map((feature: any) =>
                  typeof feature === "object" ? feature.name : String(feature),
                )
                .filter(Boolean)
                .join(", ")}
            </Text>
          </View>
        ) : null}

        {/* Main Listing Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Listing Details</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter listing title"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your item or service in detail..."
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Location (City) *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={cityId}
                onValueChange={(val) => setCityId(String(val))}
                style={styles.picker}
                mode="dropdown"
              >
                <Picker.Item
                  label="-- Select City --"
                  value=""
                  color="#94a3b8"
                />
                {cities.map((city) => (
                  <Picker.Item
                    key={city.id}
                    label={city.name}
                    value={String(city.id)}
                    color="#111827"
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Meta Description (SEO)</Text>
            <TextInput
              style={[styles.input, styles.metaArea]}
              placeholder="Meta description for search engines..."
              placeholderTextColor="#94a3b8"
              value={metaDescription}
              onChangeText={setMetaDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={styles.fieldHint}>
              Short summary for search engines (optional)
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Price (PKR) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 50000"
              placeholderTextColor="#94a3b8"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mobile Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="03001234567"
              placeholderTextColor="#94a3b8"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>WhatsApp Number</Text>
            <TextInput
              style={styles.input}
              placeholder="03001234567"
              placeholderTextColor="#94a3b8"
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <Pressable
          style={[styles.submitButton, busy && styles.submitButtonDisabled]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {isEditMode ? "Update Listing" : "Publish Listing"}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    padding: 20,
    backgroundColor: "#f3f7fc",
    flexGrow: 1,
  },
  topBackBtn: {
    alignSelf: "flex-start",
    marginBottom: 10,
    paddingVertical: 4,
  },
  backText: {
    color: "#1d4ed8",
    fontWeight: "700",
    fontSize: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTag: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    fontWeight: "700",
    fontSize: 12,
  },
  pageHeading: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  pageSubheading: {
    color: "#64748b",
    fontSize: 14,
    marginBottom: 16,
  },
  categoryLayout: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  categoryList: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 12,
    overflow: "hidden",
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#edf2f9",
    backgroundColor: "#ffffff",
  },
  categoryItemActive: {
    backgroundColor: "#dbeafe",
    borderLeftWidth: 4,
    borderLeftColor: "#1d4ed8",
    paddingLeft: 10,
  },
  categoryName: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  categoryNameActive: {
    color: "#1e40af",
    fontWeight: "700",
  },
  categoryArrow: {
    color: "#94a3b8",
    fontSize: 18,
    fontWeight: "700",
  },
  subCategoryPanel: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  subCategoryHeader: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subCategoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#edf2f9",
  },
  subCategoryText: {
    color: "#1e293b",
    fontSize: 14,
    fontWeight: "500",
  },
  continueCard: {
    marginTop: 12,
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    padding: 14,
  },
  continueLabel: {
    color: "#1e40af",
    fontWeight: "700",
    fontSize: 15,
  },
  continueHint: {
    color: "#475569",
    fontSize: 12,
    marginTop: 3,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 20,
  },
  categoryBadgeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 16,
  },
  categoryBadgeLeft: {
    flex: 1,
  },
  categoryBadgeLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  categoryBadgeValue: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  changeCategoryBtn: {
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeCategoryText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 13,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 14,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#60a5fa",
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    minHeight: 100,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  uploadMainText: {
    color: "#1d4ed8",
    fontWeight: "700",
    fontSize: 14,
  },
  uploadSubText: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  previewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  previewWrapper: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#dbe4f0",
    backgroundColor: "#edf2f9",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  primaryBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 118, 110, 0.88)",
    paddingVertical: 2,
    alignItems: "center",
  },
  primaryBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  fieldHint: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    minHeight: 46,
  },
  textArea: {
    minHeight: 110,
  },
  metaArea: {
    minHeight: 70,
  },
  pickerContainer: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 10,
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    minHeight: 46,
    color: "#111827",
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 46,
  },
  dropdownText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "500",
  },
  placeholderText: {
    color: "#94a3b8",
  },
  dropdownArrow: {
    color: "#64748b",
    fontSize: 16,
  },
  optionList: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 10,
    marginTop: 6,
    maxHeight: 180,
    overflow: "hidden",
  },
  optionItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#edf2f9",
  },
  optionText: {
    color: "#334155",
    fontSize: 14,
  },
  optionTextActive: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  chip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe4f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },
  chipSelected: {
    backgroundColor: "#dbeafe",
    borderColor: "#1d4ed8",
  },
  chipText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#1e40af",
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  loader: {
    marginVertical: 20,
  },
  errorBox: {
    padding: 16,
    backgroundColor: "#ffeeec",
    borderRadius: 8,
    alignItems: "center",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#b91c1c",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
});
