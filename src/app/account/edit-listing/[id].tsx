import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  fetchCategories,
  fetchCategoryAttributes,
  fetchCities,
  fetchSubCategories,
} from "../../../api/categories";
import { fetchMyListingDetail, updateListing } from "../../../api/listings";
import { useAuth } from "../../../hooks/useAuth";
import { toUploadFile } from "../../../utils/upload-file";
import type { AttributeField } from "../../../constants/listingAttributes";

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const listingId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();

  // Listing data
  const [listing, setListing] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  // Selected Category / SubCategory
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [selectedCategorySlug, setSelectedCategorySlug] = useState("");
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<number | null>(null);
  const [selectedSubCategoryName, setSelectedSubCategoryName] = useState("");
  const [selectedSubCategorySlug, setSelectedSubCategorySlug] = useState("");
  const [selectedChildCategoryId, setSelectedChildCategoryId] = useState<number | null>(null);
  const [selectedChildCategoryName, setSelectedChildCategoryName] = useState("");
  const [selectedChildCategorySlug, setSelectedChildCategorySlug] = useState("");

  // Dynamic Attributes
  const [attributeFields, setAttributeFields] = useState<AttributeField[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, any>>({});
  const [loadingAttributes, setLoadingAttributes] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cityId, setCityId] = useState("");
  const [address, setAddress] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [regularPrice, setRegularPrice] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // Images state
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [newCoverAsset, setNewCoverAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [existingGalleries, setExistingGalleries] = useState<any[]>([]);
  const [newGalleryAssets, setNewGalleryAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);

  // Modals & Popups
  const [pickerModal, setPickerModal] = useState<{
    key: string;
    label: string;
    options: string[];
    selected: string;
    onSelect: (val: string) => void;
  } | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [categoryStep, setCategoryStep] = useState<"category" | "subcategory">("category");
  const [tempCategoryId, setTempCategoryId] = useState<number | null>(null);
  const [tempCategoryName, setTempCategoryName] = useState("");
  const [tempCategorySlug, setTempCategorySlug] = useState("");
  const [tempSubCategories, setTempSubCategories] = useState<any[]>([]);
  const [loadingModalSubs, setLoadingModalSubs] = useState(false);

  // Status
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!listingId) {
      setError("Invalid listing ID.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [detail, categoryData, cityData] = await Promise.all([
        fetchMyListingDetail(listingId),
        fetchCategories(),
        fetchCities(),
      ]);

      if (!detail) throw new Error("Listing not found or unavailable.");

      setListing(detail);
      const cats = categoryData || [];
      setCategories(cats);
      setCities(cityData || []);

      // Pre-fill form fields
      setTitle(detail.title || "");
      setDescription(detail.raw_description || detail.description || "");
      setCityId(String(detail.city?.id ?? detail.city_id ?? ""));
      setAddress(detail.address || detail.custom_fields?.address || "");
      setMetaTitle(detail.seo_title || detail.custom_fields?.seo_title || detail.title || "");
      setMetaDescription(detail.seo_description || detail.custom_fields?.seo_description || "");
      setRegularPrice(
        detail.regular_price !== null && detail.regular_price !== undefined
          ? String(detail.regular_price)
          : ""
      );

      const sellerName =
        detail.custom_fields?.contact_name ||
        detail.agent?.name ||
        user?.name ||
        "";
      setContactName(sellerName);

      const contactPhone =
        detail.phone ||
        detail.custom_fields?.contact_phone ||
        detail.agent?.phone ||
        user?.phone ||
        "";
      setPhone(contactPhone);

      const whatsapp =
        detail.custom_fields?.whatsapp_number ||
        detail.agent?.whatsapp_phone ||
        user?.whatsapp_phone ||
        "";
      setWhatsappNumber(whatsapp);

      // Pre-fill images
      setCoverImageUrl(detail.thumb_image_url || null);
      if (Array.isArray(detail.galleries)) {
        setExistingGalleries(
          detail.galleries.map((g: any) => ({
            id: g.id,
            uri: g.image_url || g.image,
          }))
        );
      }

      // Pre-fill category & subcategory
      const catId = detail.category?.id ? Number(detail.category.id) : Number(detail.category_id || 0);
      const foundCat = cats.find((c: any) => Number(c.id) === catId);
      const catName = detail.category?.name || foundCat?.name || "";
      const catSlug = detail.category?.slug || foundCat?.slug || "";
      setSelectedCategoryId(catId || null);
      setSelectedCategoryName(catName);
      setSelectedCategorySlug(catSlug);

      const subId = detail.sub_category?.id
        ? Number(detail.sub_category.id)
        : Number(detail.sub_category_id || 0);
      const subName = detail.sub_category?.name || "";
      const subSlug = detail.sub_category?.slug || subName || "";
      setSelectedSubCategoryId(subId || null);
      setSelectedSubCategoryName(subName);
      setSelectedSubCategorySlug(subSlug);

      const childId = detail.child_category?.id
        ? Number(detail.child_category.id)
        : Number(detail.child_category_id || 0);
      const childName = detail.child_category?.name || "";
      const childSlug = detail.child_category?.slug || childName || "";
      setSelectedChildCategoryId(childId || null);
      setSelectedChildCategoryName(childName);
      setSelectedChildCategorySlug(childSlug);

      // Pre-fill attribute values
      const initialAttrs: Record<string, any> = {};
      if (detail.custom_fields && typeof detail.custom_fields === "object") {
        Object.assign(initialAttrs, detail.custom_fields);
      }
      if (Array.isArray(detail.attributes)) {
        detail.attributes.forEach((attr: any) => {
          if (attr.key && attr.value !== undefined) {
            initialAttrs[attr.key] = attr.value;
          }
        });
      }
      setAttributeValues(initialAttrs);

      // Fetch attributes schema using slug or name
      const catIdentifier = catSlug || catName;
      const subIdentifier = subSlug || subName;
      const childIdentifier = childSlug || childName;

      setLoadingAttributes(true);
      const schema = await fetchCategoryAttributes(catIdentifier, subIdentifier, childIdentifier);
      setAttributeFields(schema || []);
      setLoadingAttributes(false);

      // Pre-load subcategories for this category
      if (catId) {
        fetchSubCategories(catId)
          .then((subs) => setSubCategories(subs || []))
          .catch(() => setSubCategories([]));
      }
    } catch (err: any) {
      setError(err?.message || "Unable to load listing details.");
    } finally {
      setLoading(false);
    }
  }, [listingId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load attributes dynamically when category or subcategory changes
  const refreshAttributes = useCallback(
    async (catSlug: string, subSlug: string, childSlug: string) => {
      setLoadingAttributes(true);
      try {
        const schema = await fetchCategoryAttributes(catSlug, subSlug, childSlug);
        setAttributeFields(schema || []);
      } catch {
        setAttributeFields([]);
      } finally {
        setLoadingAttributes(false);
      }
    },
    []
  );

  const updateAttributeValue = (key: string, val: any) => {
    setAttributeValues((prev) => ({ ...prev, [key]: val }));
  };

  const toggleCheckboxValue = (key: string, option: string) => {
    const currentValues = Array.isArray(attributeValues[key])
      ? [...attributeValues[key]]
      : [];
    const idx = currentValues.indexOf(option);
    if (idx !== -1) {
      currentValues.splice(idx, 1);
    } else {
      currentValues.push(option);
    }
    updateAttributeValue(key, currentValues);
  };

  // Pick cover photo
  const pickCoverImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert("Permission required", "Please allow gallery access to select cover photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.85,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewCoverAsset(result.assets[0]);
    }
  };

  // Add more media (gallery)
  const pickAdditionalMedia = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert("Permission required", "Please allow gallery access to upload photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets) {
      setNewGalleryAssets((prev) => [...prev, ...result.assets]);
    }
  };

  const removeExistingGallery = (galleryId: any) => {
    setExistingGalleries((prev) => prev.filter((g) => g.id !== galleryId));
  };

  const removeNewGalleryAsset = (index: number) => {
    setNewGalleryAssets((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Category Change modal
  const openCategoryChange = () => {
    setCategoryStep("category");
    setTempCategoryId(selectedCategoryId);
    setTempCategoryName(selectedCategoryName);
    setTempCategorySlug(selectedCategorySlug);
    setCategoryModalVisible(true);
  };

  const selectTempCategory = async (cat: any) => {
    setTempCategoryId(cat.id);
    setTempCategoryName(cat.name);
    setTempCategorySlug(cat.slug);
    setLoadingModalSubs(true);
    try {
      const subs = await fetchSubCategories(cat.id);
      setTempSubCategories(subs || []);
      if (subs && subs.length > 0) {
        setCategoryStep("subcategory");
      } else {
        // No subcategories, apply directly
        applyCategorySelection(cat.id, cat.name, cat.slug, null, "", "");
      }
    } catch {
      applyCategorySelection(cat.id, cat.name, cat.slug, null, "", "");
    } finally {
      setLoadingModalSubs(false);
    }
  };

  const applyCategorySelection = (
    catId: number,
    catName: string,
    catSlug: string,
    subId: number | null,
    subName: string,
    subSlug: string
  ) => {
    setSelectedCategoryId(catId);
    setSelectedCategoryName(catName);
    setSelectedCategorySlug(catSlug);
    setSelectedSubCategoryId(subId);
    setSelectedSubCategoryName(subName);
    setSelectedSubCategorySlug(subSlug);
    setSelectedChildCategoryId(null);
    setSelectedChildCategoryName("");
    setSelectedChildCategorySlug("");
    setCategoryModalVisible(false);

    // Refresh attributes for the new category
    refreshAttributes(catSlug || catName, subSlug || subName, "");
  };

  // Selected Category Header Display Text
  const categoryDisplayText = useMemo(() => {
    if (selectedCategoryName && selectedSubCategoryName) {
      return `${selectedCategoryName} > ${selectedSubCategoryName}`;
    }
    return selectedSubCategoryName || selectedCategoryName || "Choose Category";
  }, [selectedCategoryName, selectedSubCategoryName]);

  // Selected City Name
  const selectedCityName = useMemo(() => {
    const found = cities.find((c) => String(c.id) === String(cityId));
    return found?.name || "Select location";
  }, [cities, cityId]);

  // Form submission & Update
  const handleUpdate = async () => {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const trimmedPrice = regularPrice.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedTitle) {
      Alert.alert("Missing field", "Please enter an ad title.");
      return;
    }
    if (!trimmedDesc) {
      Alert.alert("Missing field", "Please enter a description.");
      return;
    }
    if (!cityId) {
      Alert.alert("Missing field", "Please select a location (city).");
      return;
    }
    if (!trimmedPrice) {
      Alert.alert("Missing field", "Please enter a price.");
      return;
    }
    if (!trimmedPhone) {
      Alert.alert("Missing field", "Please enter a mobile phone number.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const form = new FormData();
      form.append("title", trimmedTitle);
      form.append("description", trimmedDesc);
      if (selectedCategoryId) form.append("category_id", String(selectedCategoryId));
      if (selectedSubCategoryId) form.append("sub_category_id", String(selectedSubCategoryId));
      if (selectedChildCategoryId) form.append("child_category_id", String(selectedChildCategoryId));
      form.append("city_id", String(cityId));
      form.append("regular_price", trimmedPrice);
      form.append("address", address.trim());
      form.append("phone", trimmedPhone);

      if (metaTitle.trim()) form.append("seo_title", metaTitle.trim());
      if (metaDescription.trim()) form.append("seo_description", metaDescription.trim());

      // Append contact fields
      form.append("custom_fields[contact_name]", contactName.trim() || trimmedTitle);
      form.append("custom_fields[contact_phone]", trimmedPhone);
      if (whatsappNumber.trim()) {
        form.append("custom_fields[whatsapp_number]", whatsappNumber.trim());
      }

      // Append dynamic attributes
      Object.entries(attributeValues).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          val.forEach((item) => form.append(`custom_fields[${key}][]`, String(item)));
        } else if (val !== undefined && val !== null && val !== "") {
          form.append(`custom_fields[${key}]`, String(val));
        }
      });

      // Cover image upload
      if (newCoverAsset) {
        form.append("thumb_image", (await toUploadFile(newCoverAsset)) as any);
      }

      // New gallery photos upload
      for (const asset of newGalleryAssets) {
        form.append("gallery[]", (await toUploadFile(asset)) as any);
      }

      await updateListing(listingId, form);

      Alert.alert("Success", "Listing updated successfully!", [
        {
          text: "View Listing",
          onPress: () => {
            router.replace({
              pathname: "/listing/[id]",
              params: { id: String(listingId) },
            });
          },
        },
      ]);
    } catch (saveError: any) {
      const serverErrors = saveError?.response?.data?.errors || saveError?.errors;
      const fieldErrors = serverErrors
        ? Object.values(serverErrors).flat().join("\n")
        : "";
      const msg = fieldErrors || saveError?.message || "Could not update listing.";
      Alert.alert("Update Failed", msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0b3034" />
        <Text style={styles.loadingText}>Loading listing details...</Text>
      </SafeAreaView>
    );
  }

  if (error && !listing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={loadData} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Top Navigation Bar with Back button and ORVIX logo */}
      <View style={styles.topbar}>
        <View style={styles.topbarInner}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </Pressable>

          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>ORVIX</Text>
          </View>

          <View style={styles.topbarSpacer} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Page Heading */}
        <Text style={styles.pageHeading}>Edit Classified Listing</Text>

        {error ? (
          <View style={styles.bannerError}>
            <Text style={styles.bannerErrorText}>{error}</Text>
          </View>
        ) : null}

        {/* Two-Column Responsive Layout */}
        <View style={[styles.mainLayout, isWide && styles.mainLayoutWide]}>
          {/* Left Column: Form Cards */}
          <View style={styles.formColumn}>
            {/* Card 1: Selected Category */}
            <View style={styles.card}>
              <View style={styles.categoryRow}>
                <View style={styles.categoryLeft}>
                  <View style={styles.categoryIconCircle}>
                    <Text style={styles.categoryIconText}>📁</Text>
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryMetaText}>Category</Text>
                    <Text style={styles.categoryTitleText}>{categoryDisplayText}</Text>
                  </View>
                </View>
                <Pressable onPress={openCategoryChange} style={styles.changeBtn}>
                  <Text style={styles.changeBtnText}>Change</Text>
                </Pressable>
              </View>
            </View>

            {/* Card 2: Upload Images */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Upload Images</Text>

              {/* Primary 315x230 Preview Upload Box */}
              <View style={styles.uploadDashedBox}>
                <View style={styles.previewFrame}>
                  {newCoverAsset?.uri ? (
                    <Image source={{ uri: newCoverAsset.uri }} style={styles.previewImage} resizeMode="cover" />
                  ) : coverImageUrl ? (
                    <Image source={{ uri: coverImageUrl }} style={styles.previewImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.placeholderContainer}>
                      <Text style={styles.placeholderDimension}>315x230</Text>
                    </View>
                  )}
                </View>

                <Pressable onPress={pickCoverImage} style={styles.selectFileLink}>
                  <Text style={styles.selectFileLinkText}>Select New File to Upload</Text>
                </Pressable>
              </View>

              {/* Add More Media Button */}
              <Pressable onPress={pickAdditionalMedia} style={styles.addMediaDashedBtn}>
                <Text style={styles.addMediaText}>+ Add More Media</Text>
              </Pressable>

              <Text style={styles.landscapeHint}>
                (For the best display we recommend using the landscape mode)
              </Text>

              {/* Gallery Thumbnails List */}
              {(existingGalleries.length > 0 || newGalleryAssets.length > 0) && (
                <View style={styles.galleryPreviewSection}>
                  <Text style={styles.galleryHeading}>Gallery Media ({existingGalleries.length + newGalleryAssets.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryList}>
                    {existingGalleries.map((img) => (
                      <View key={`exist-${img.id}`} style={styles.galleryThumbWrapper}>
                        <Image source={{ uri: img.uri }} style={styles.galleryThumb} resizeMode="cover" />
                        <Pressable onPress={() => removeExistingGallery(img.id)} style={styles.removeThumbBtn}>
                          <Text style={styles.removeThumbText}>×</Text>
                        </Pressable>
                      </View>
                    ))}
                    {newGalleryAssets.map((asset, idx) => (
                      <View key={`new-${asset.uri}-${idx}`} style={styles.galleryThumbWrapper}>
                        <Image source={{ uri: asset.uri }} style={styles.galleryThumb} resizeMode="cover" />
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>New</Text>
                        </View>
                        <Pressable onPress={() => removeNewGalleryAsset(idx)} style={styles.removeThumbBtn}>
                          <Text style={styles.removeThumbText}>×</Text>
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Card 3: Attributes (Dynamic according to categories) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Attributes</Text>

              {loadingAttributes ? (
                <View style={styles.attributeLoadingBox}>
                  <ActivityIndicator size="small" color="#0b3034" />
                  <Text style={styles.attrLoadingText}>Loading category attributes...</Text>
                </View>
              ) : attributeFields.length === 0 ? (
                <Text style={styles.noAttributesText}>
                  No specific attributes required for this category.
                </Text>
              ) : (
                <View style={styles.attributesGrid}>
                  {attributeFields.map((field) => {
                    const fieldValue = attributeValues[field.key] ?? "";

                    // Radio group (e.g. Dedicated Graphic Card)
                    if (field.type === "radio") {
                      return (
                        <View key={field.key} style={styles.attributeFullCol}>
                          <Text style={styles.attributeLabel}>{field.label}</Text>
                          <View style={styles.radioGroup}>
                            {(field.options || []).map((opt) => {
                              const isChecked = String(fieldValue) === String(opt);
                              return (
                                <Pressable
                                  key={opt}
                                  onPress={() => updateAttributeValue(field.key, opt)}
                                  style={styles.radioOption}
                                >
                                  <View style={[styles.radioOuterCircle, isChecked && styles.radioOuterChecked]}>
                                    {isChecked && <View style={styles.radioInnerCircle} />}
                                  </View>
                                  <Text style={styles.radioOptionLabel}>{opt}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      );
                    }

                    // Checkbox group
                    if (field.type === "checkbox") {
                      const selected = Array.isArray(fieldValue) ? fieldValue : [];
                      return (
                        <View key={field.key} style={styles.attributeFullCol}>
                          <Text style={styles.attributeLabel}>{field.label}</Text>
                          <View style={styles.checkboxGroup}>
                            {(field.options || []).map((opt) => {
                              const isChecked = selected.includes(opt);
                              return (
                                <Pressable
                                  key={opt}
                                  onPress={() => toggleCheckboxValue(field.key, opt)}
                                  style={styles.checkboxOption}
                                >
                                  <View style={[styles.checkboxSquare, isChecked && styles.checkboxSquareChecked]}>
                                    {isChecked && <Text style={styles.checkboxCheckmark}>✓</Text>}
                                  </View>
                                  <Text style={styles.checkboxOptionLabel}>{opt}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      );
                    }

                    // Dropdown Select
                    if (field.type === "select") {
                      return (
                        <View key={field.key} style={styles.attributeHalfCol}>
                          <Text style={styles.attributeLabel}>{field.label}</Text>
                          <Pressable
                            onPress={() =>
                              setPickerModal({
                                key: field.key,
                                label: field.label,
                                options: field.options || [],
                                selected: String(fieldValue || ""),
                                onSelect: (val) => updateAttributeValue(field.key, val),
                              })
                            }
                            style={styles.dropdownBtn}
                          >
                            <Text
                              style={[
                                styles.dropdownBtnText,
                                !fieldValue && styles.placeholderText,
                              ]}
                              numberOfLines={1}
                            >
                              {fieldValue || `Select ${field.label}`}
                            </Text>
                            <Text style={styles.dropdownChevron}>▾</Text>
                          </Pressable>
                        </View>
                      );
                    }

                    // Text or Number input
                    return (
                      <View key={field.key} style={styles.attributeHalfCol}>
                        <Text style={styles.attributeLabel}>{field.label}</Text>
                        <TextInput
                          style={styles.input}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          placeholderTextColor="#94a3b8"
                          value={fieldValue ? String(fieldValue) : ""}
                          onChangeText={(text) => updateAttributeValue(field.key, text)}
                          keyboardType={field.type === "number" ? "numeric" : "default"}
                        />
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Card 4: Details */}
            <View style={styles.card}>
              {/* Ad Title */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Ad Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter listing title"
                  placeholderTextColor="#94a3b8"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={70}
                />
                <View style={styles.fieldSubRow}>
                  <Text style={styles.fieldHint}>
                    Mention the key features of your item (e.g. brand, model, age, type)
                  </Text>
                  <Text style={styles.charCounter}>{title.length}/70</Text>
                </View>
              </View>

              {/* Description */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Include condition, features and reason for selling"
                  placeholderTextColor="#94a3b8"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              {/* Location (City) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Location *</Text>
                <Pressable onPress={() => setCityModalVisible(true)} style={styles.dropdownBtn}>
                  <Text style={[styles.dropdownBtnText, !cityId && styles.placeholderText]}>
                    {selectedCityName}
                  </Text>
                  <Text style={styles.dropdownChevron}>▾</Text>
                </Pressable>
              </View>

              {/* Neighborhood Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Neighborhood Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter neighborhood name"
                  placeholderTextColor="#94a3b8"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

              {/* Meta Title */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Meta Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="SEO Meta Title"
                  placeholderTextColor="#94a3b8"
                  value={metaTitle}
                  onChangeText={setMetaTitle}
                />
              </View>

              {/* Meta Description */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Meta Description</Text>
                <TextInput
                  style={[styles.input, styles.metaArea]}
                  placeholder="SEO Meta Description"
                  placeholderTextColor="#94a3b8"
                  value={metaDescription}
                  onChangeText={setMetaDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Card 5: Price */}
            <View style={styles.card}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Price *</Text>
                <View style={styles.priceRow}>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>PKR</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.priceInput]}
                    placeholder="Enter regular price (PKR)"
                    placeholderTextColor="#94a3b8"
                    value={regularPrice}
                    onChangeText={setRegularPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Card 6: Seller Contact Details */}
            <View style={styles.card}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your contact name"
                  placeholderTextColor="#94a3b8"
                  value={contactName}
                  onChangeText={setContactName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Mobile Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="03001234567"
                  placeholderTextColor="#94a3b8"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>WhatsApp Number</Text>
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

            {/* Submit Update Button */}
            <Pressable
              onPress={handleUpdate}
              disabled={saving}
              style={[styles.updateBtn, saving && styles.updateBtnDisabled]}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.updateBtnText}>Update Listing</Text>
              )}
            </Pressable>
          </View>

          {/* Right Column: Help & Resources Sidebar */}
          <View style={styles.sidebarColumn}>
            <View style={styles.helpCard}>
              <Text style={styles.helpHeading}>Need help getting started?</Text>
              <Text style={styles.helpSubheading}>
                Review these resources to learn how to create a great ad and increase your selling chances:
              </Text>

              <View style={styles.helpBullets}>
                <View style={styles.bulletItem}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>
                    Tips for improving your ads and your chances of selling
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>
                    All you need to know about Posting ads
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>
                    You can always make changes to your ad
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Dropdown Options Picker Modal */}
      <Modal
        visible={!!pickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPickerModal(null)}>
          <View style={styles.pickerModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {pickerModal?.label}</Text>
              <Pressable onPress={() => setPickerModal(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              {(pickerModal?.options || []).map((opt) => {
                const isSelected = pickerModal?.selected === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      pickerModal?.onSelect(opt);
                      setPickerModal(null);
                    }}
                    style={[styles.modalOptionItem, isSelected && styles.modalOptionActive]}
                  >
                    <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextActive]}>
                      {opt}
                    </Text>
                    {isSelected && <Text style={styles.modalCheckmark}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* City Location Picker Modal */}
      <Modal
        visible={cityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCityModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCityModalVisible(false)}>
          <View style={styles.pickerModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <Pressable onPress={() => setCityModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              {cities.map((c) => {
                const isSelected = String(cityId) === String(c.id);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setCityId(String(c.id));
                      setCityModalVisible(false);
                    }}
                    style={[styles.modalOptionItem, isSelected && styles.modalOptionActive]}
                  >
                    <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextActive]}>
                      {c.name}
                    </Text>
                    {isSelected && <Text style={styles.modalCheckmark}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Category Change Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCategoryModalVisible(false)}>
          <View style={styles.categoryModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {categoryStep === "category" ? "Select Category" : `Subcategory: ${tempCategoryName}`}
              </Text>
              <Pressable onPress={() => setCategoryModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            {categoryStep === "subcategory" && (
              <Pressable onPress={() => setCategoryStep("category")} style={styles.backToCatBtn}>
                <Text style={styles.backToCatText}>← Choose Different Category</Text>
              </Pressable>
            )}

            <ScrollView style={styles.modalScroll}>
              {loadingModalSubs ? (
                <View style={styles.modalLoader}>
                  <ActivityIndicator size="small" color="#0b3034" />
                </View>
              ) : categoryStep === "category" ? (
                categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => selectTempCategory(cat)}
                    style={styles.modalOptionItem}
                  >
                    <Text style={styles.modalOptionText}>{cat.name}</Text>
                    <Text style={styles.modalOptionArrow}>›</Text>
                  </Pressable>
                ))
              ) : (
                tempSubCategories.map((sub) => (
                  <Pressable
                    key={sub.id}
                    onPress={() =>
                      applyCategorySelection(
                        tempCategoryId || 0,
                        tempCategoryName,
                        tempCategorySlug,
                        sub.id,
                        sub.name,
                        sub.slug
                      )
                    }
                    style={styles.modalOptionItem}
                  >
                    <Text style={styles.modalOptionText}>{sub.name}</Text>
                    <Text style={styles.modalCheckmark}>✓</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#64748b",
  },
  errorText: {
    fontSize: 15,
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: "#0b3034",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#ffffff",
    fontWeight: "600",
  },

  // Top Bar
  topbar: {
    height: 56,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#dfe2e4",
    justifyContent: "center",
  },
  topbarInner: {
    maxWidth: 1060,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dfe2e4",
    backgroundColor: "#f8fafb",
  },
  backBtnText: {
    color: "#20262d",
    fontSize: 13,
    fontWeight: "600",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#0b3034",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
  },
  topbarSpacer: {
    width: 70,
  },

  // Page Scroll
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  pageHeading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#20262d",
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: -0.5,
  },

  bannerError: {
    maxWidth: 1060,
    width: "100%",
    alignSelf: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  bannerErrorText: {
    color: "#b91c1c",
    fontSize: 13,
  },

  // Responsive Layout
  mainLayout: {
    maxWidth: 1060,
    width: "100%",
    alignSelf: "center",
    flexDirection: "column",
    gap: 20,
  },
  mainLayoutWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  formColumn: {
    flex: 1,
    width: "100%",
  },
  sidebarColumn: {
    width: "100%",
    maxWidth: 290,
  },

  // Cards
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dfe2e4",
    borderRadius: 10,
    padding: 18,
    marginBottom: 18,
    ...Platform.select({
      web: {
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      },
      default: {
        elevation: 1,
      },
    }),
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#20262d",
    marginBottom: 14,
  },

  // Card 1: Category Header
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  categoryIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#edf8f9",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconText: {
    fontSize: 18,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryMetaText: {
    fontSize: 11,
    color: "#67737a",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  categoryTitleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#20262d",
    marginTop: 2,
  },
  changeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#c4cbd1",
    backgroundColor: "#ffffff",
  },
  changeBtnText: {
    color: "#20262d",
    fontSize: 13,
    fontWeight: "600",
  },

  // Card 2: Upload Images
  uploadDashedBox: {
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: "#88c4ca",
    borderRadius: 8,
    backgroundColor: "#f7fafb",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  previewFrame: {
    width: 315,
    maxWidth: "100%",
    height: 200,
    borderRadius: 6,
    backgroundColor: "#d9e2e6",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderDimension: {
    color: "#73828c",
    fontSize: 22,
    fontWeight: "600",
  },
  selectFileLink: {
    marginTop: 14,
    paddingVertical: 4,
  },
  selectFileLinkText: {
    color: "#0b6477",
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  addMediaDashedBtn: {
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: "#88c4ca",
    borderRadius: 6,
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  addMediaText: {
    color: "#0b6477",
    fontSize: 14,
    fontWeight: "700",
  },
  landscapeHint: {
    fontSize: 11.5,
    color: "#8c9ba5",
    textAlign: "center",
    marginTop: 8,
  },
  galleryPreviewSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#edf0f2",
    paddingTop: 12,
  },
  galleryHeading: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  galleryList: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  galleryThumbWrapper: {
    width: 76,
    height: 76,
    borderRadius: 6,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#dfe2e4",
  },
  galleryThumb: {
    width: "100%",
    height: "100%",
  },
  removeThumbBtn: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeThumbText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 15,
  },
  newBadge: {
    position: "absolute",
    bottom: 2,
    left: 2,
    backgroundColor: "#0b6477",
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  newBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },

  // Card 3: Attributes
  attributeLoadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  attrLoadingText: {
    fontSize: 13,
    color: "#67737a",
  },
  noAttributesText: {
    fontSize: 13,
    color: "#67737a",
    fontStyle: "italic",
    paddingVertical: 8,
  },
  attributesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  attributeHalfCol: {
    width: "50%",
    paddingHorizontal: 8,
    marginBottom: 16,
    minWidth: 240,
  },
  attributeFullCol: {
    width: "100%",
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  attributeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#20262d",
    marginBottom: 6,
  },
  dropdownBtn: {
    height: 44,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dfe2e4",
    borderRadius: 6,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownBtnText: {
    fontSize: 14,
    color: "#20262d",
    flex: 1,
  },
  placeholderText: {
    color: "#94a3b8",
  },
  dropdownChevron: {
    fontSize: 14,
    color: "#4b5563",
    marginLeft: 6,
  },

  // Radio styling
  radioGroup: {
    flexDirection: "column",
    gap: 8,
    marginTop: 2,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  radioOuterCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#94a3b8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  radioOuterChecked: {
    borderColor: "#0b6477",
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0b6477",
  },
  radioOptionLabel: {
    fontSize: 14,
    color: "#20262d",
  },

  // Checkbox styling
  checkboxGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  checkboxOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    minWidth: 130,
  },
  checkboxSquare: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#94a3b8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  checkboxSquareChecked: {
    borderColor: "#0b6477",
    backgroundColor: "#0b6477",
  },
  checkboxCheckmark: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 13,
  },
  checkboxOptionLabel: {
    fontSize: 13.5,
    color: "#20262d",
  },

  // Form Fields
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#20262d",
    marginBottom: 6,
  },
  input: {
    height: 44,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dfe2e4",
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#20262d",
  },
  textArea: {
    height: 110,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  metaArea: {
    height: 80,
    paddingTop: 8,
    textAlignVertical: "top",
  },
  fieldSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  fieldHint: {
    fontSize: 11,
    color: "#67737a",
    flex: 1,
  },
  charCounter: {
    fontSize: 11,
    color: "#94a3b8",
    marginLeft: 8,
  },

  // Price field
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  currencyBadge: {
    height: 44,
    paddingHorizontal: 14,
    backgroundColor: "#f1f5f6",
    borderWidth: 1,
    borderColor: "#dfe2e4",
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    borderRightWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#20262d",
  },
  priceInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },

  // Update Button
  updateBtn: {
    backgroundColor: "#002f34",
    borderRadius: 6,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 40,
    ...Platform.select({
      web: {
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      },
      default: {
        elevation: 2,
      },
    }),
  },
  updateBtnDisabled: {
    opacity: 0.65,
  },
  updateBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Sidebar Help
  helpCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dfe2e4",
    borderRadius: 10,
    padding: 18,
    ...Platform.select({
      web: {
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      },
      default: {
        elevation: 1,
      },
    }),
  },
  helpHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#20262d",
    marginBottom: 10,
  },
  helpSubheading: {
    fontSize: 12.5,
    color: "#67737a",
    lineHeight: 18,
    marginBottom: 14,
  },
  helpBullets: {
    gap: 10,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletDot: {
    fontSize: 14,
    color: "#0b6477",
    lineHeight: 18,
  },
  bulletText: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 18,
    flex: 1,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  pickerModalContent: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
  },
  categoryModalCard: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "80%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#dfe2e4",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#20262d",
    flex: 1,
  },
  modalClose: {
    fontSize: 18,
    color: "#67737a",
    fontWeight: "700",
    padding: 4,
  },
  backToCatBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: "#f8fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#edf0f2",
  },
  backToCatText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#0b6477",
  },
  modalScroll: {
    paddingVertical: 6,
  },
  modalOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  modalOptionActive: {
    backgroundColor: "#edf8f9",
  },
  modalOptionText: {
    fontSize: 14,
    color: "#20262d",
    flex: 1,
  },
  modalOptionTextActive: {
    color: "#0b6477",
    fontWeight: "700",
  },
  modalCheckmark: {
    fontSize: 14,
    color: "#0b6477",
    fontWeight: "700",
  },
  modalOptionArrow: {
    fontSize: 18,
    color: "#94a3b8",
  },
  modalLoader: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
});
