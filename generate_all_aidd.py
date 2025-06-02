# generate_all_aidd.py
import pandas as pd
import os

# Import utilities from common_gretel_setup
from common_gretel_setup import (
    create_and_run_aidd,
    OUTPUT_DIR, DEFAULT_NUM_RECORDS_TO_GENERATE,
    save_ids_for_gretel, load_ids_for_gretel,
    initialize_gretel_client
)

# Import SamplerColumn, LLMTextColumn, and params aliased as P
from gretel_client.data_designer.columns import SamplerColumn, LLMTextColumn
import gretel_client.data_designer.params as P # Alias for convenience

# --- 0. Initialize Gretel Client ---
try:
    initialize_gretel_client()
except ValueError as e:
    print(f"Error: {e}")
    print("Please set the GRETEL_API_KEY environment variable.")
    # Consider if GRETEL_PROJECT_NAME is also mandatory for your setup.
    # If Gretel client init is optional until first AIDD run, this could be moved/conditional.
    exit(1)
except Exception as e:
    print(f"An unexpected error occurred during Gretel client initialization: {e}")
    exit(1)

# --- 1. Generate Categories (Predefined) ---
EBAY_LIKE_CATEGORIES = [
    {"gretel_category_id": "CAT001", "category_name": "Electronics", "parent_gretel_category_id": None, "description": "Consumer electronics, gadgets, and accessories."},
    {"gretel_category_id": "CAT002", "category_name": "Computers & Tablets", "parent_gretel_category_id": "CAT001", "description": "Laptops, desktops, tablets, and networking gear."},
    {"gretel_category_id": "CAT003", "category_name": "Laptops", "parent_gretel_category_id": "CAT002", "description": "Portable computers for work and play."},
    {"gretel_category_id": "CAT004", "category_name": "PC Laptops & Netbooks", "parent_gretel_category_id": "CAT003", "description": "Windows and ChromeOS laptops."},
    {"gretel_category_id": "CAT005", "category_name": "Apple Laptops", "parent_gretel_category_id": "CAT003", "description": "MacBook Air, MacBook Pro."},
    {"gretel_category_id": "CAT006", "category_name": "Fashion", "parent_gretel_category_id": None, "description": "Clothing, shoes, and accessories for all."},
    {"gretel_category_id": "CAT007", "category_name": "Men's Fashion", "parent_gretel_category_id": "CAT006", "description": "Men's apparel, footwear, and accessories."},
    {"gretel_category_id": "CAT008", "category_name": "Men's Shoes", "parent_gretel_category_id": "CAT007", "description": "Sneakers, boots, dress shoes for men."},
    {"gretel_category_id": "CAT009", "category_name": "Men's Sneakers", "parent_gretel_category_id": "CAT008", "description": "Athletic and casual sneakers for men."},
    {"gretel_category_id": "CAT010", "category_name": "Collectibles", "parent_gretel_category_id": None, "description": "Items of interest to collectors."},
    {"gretel_category_id": "CAT011", "category_name": "Trading Cards", "parent_gretel_category_id": "CAT010", "description": "Collectible trading cards."},
    {"gretel_category_id": "CAT012", "category_name": "Sports Trading Cards", "parent_gretel_category_id": "CAT011", "description": "Cards from basketball, baseball, football, etc."},
    {"gretel_category_id": "CAT013", "category_name": "Non-Sport Trading Cards", "parent_gretel_category_id": "CAT011", "description": "Pokémon, MTG, Yu-Gi-Oh!, etc."},
    {"gretel_category_id": "CAT014", "category_name": "Pokémon TCG Cards", "parent_gretel_category_id": "CAT013", "description": "Collectible cards from the Pokémon Trading Card Game."},
    {"gretel_category_id": "CAT015", "category_name": "Toys & Hobbies", "parent_gretel_category_id": None, "description": "Toys, games, and hobbyist items."},
    {"gretel_category_id": "CAT016", "category_name": "Action Figures", "parent_gretel_category_id": "CAT015", "description": "Collectible action figures from various franchises."},
    {"gretel_category_id": "CAT017", "category_name": "Funko Pop! Vinyl", "parent_gretel_category_id": "CAT016", "description": "Funko Pop! collectible vinyl figures."},
]

def run_generate_categories():
    print("\n--- Generating Categories (Predefined) ---")
    df_categories = pd.DataFrame(EBAY_LIKE_CATEGORIES)
    df_categories['description'] = df_categories.apply(
        lambda row: row['description'] if pd.notna(row['description']) else f"Explore {row['category_name']}",
        axis=1
    )
    output_filename = os.path.join(OUTPUT_DIR, "categories_synthetic.csv")
    df_categories.to_csv(output_filename, index=False)
    print(f"Predefined categories saved to {output_filename}")
    save_ids_for_gretel(df_categories, "gretel_category_id", "_for_gretel")
    print("--- Finished Generating Categories ---")
    return df_categories

# --- 2. Generate Users ---
NUM_USERS_TO_GENERATE = DEFAULT_NUM_RECORDS_TO_GENERATE

def run_generate_users():
    print("\n--- Generating Users ---")
    columns = [
        SamplerColumn(name="gretel_user_id", type=P.SamplerType.UUID, params=P.UUIDSamplerParams()),
        SamplerColumn(name="first_name", type=P.SamplerType.FIRST_NAME, params=P.FirstNameSamplerParams()),
        SamplerColumn(name="last_name", type=P.SamplerType.LAST_NAME, params=P.LastNameSamplerParams()),
        LLMTextColumn(
            name="username",
            prompt="Generate a unique and plausible username for an online marketplace user named {{ record.first_name }} {{ record.last_name }}. Make it creative but not too long. Avoid special characters other than underscores or numbers. Ensure it is under 50 characters."
        ),
        SamplerColumn(
            name="email",
            type=P.SamplerType.EMAIL_ADDRESS,
            params=P.EmailAddressSamplerParams(domain="synthetic-biddify.com")
        ),
        SamplerColumn(name="password_placeholder", type=P.SamplerType.CONSTANT, params=P.ConstantSamplerParams(value="password123Synthetic")),
        SamplerColumn(name="profile_picture_url_template", type=P.SamplerType.CONSTANT, params=P.ConstantSamplerParams(value="https://i.pravatar.cc/150?u={{record.gretel_user_id}}")),
        LLMTextColumn(
            name="bio",
            prompt="Write a short, friendly bio (1-2 sentences, under 250 characters) for an online marketplace user named {{ record.first_name }}. They might be interested in buying or selling collectibles, fashion, or electronics. Keep it concise.",
            optional=0.3
        ),
        SamplerColumn(name="is_verified_str", type=P.SamplerType.BOOLEAN, params=P.BooleanSamplerParams(true_ratio=0.75)),
        SamplerColumn(name="full_name", type=P.SamplerType.FULL_NAME, params=P.FullNameSamplerParams()),
        SamplerColumn(name="seller_rating_str", type=P.SamplerType.UNIFORM, params=P.UniformSamplerParams(low=3.5, high=5.0, num_decimals=1), optional=0.6, convert_to="float"),
        SamplerColumn(name="buyer_rating_str", type=P.SamplerType.UNIFORM, params=P.UniformSamplerParams(low=3.8, high=5.0, num_decimals=1), optional=0.9, convert_to="float"), # Reduced optionality from 0.9 to make it more likely to appear
        SamplerColumn(name="stripe_customer_id_placeholder", type=P.SamplerType.CONSTANT, params=P.ConstantSamplerParams(value="cus_synthetic_{{record.gretel_user_id[:8]}}"), optional=0.7),
        SamplerColumn(name="created_at_str", type=P.SamplerType.DATETIME, params=P.DatetimeSamplerParams(begin_date="-2y", end_date="now")),
        SamplerColumn(name="updated_at_str", type=P.SamplerType.DATETIME, params=P.DatetimeSamplerParams(begin_date="-1y", end_date="now")),
        SamplerColumn(name="last_login_str", type=P.SamplerType.DATETIME, params=P.DatetimeSamplerParams(begin_date="-30d", end_date="now"), optional=0.05), # Reduced optionality from 0.95
        SamplerColumn(name="is_banned_str", type=P.SamplerType.BOOLEAN, params=P.BooleanSamplerParams(true_ratio=0.05)),
    ]
    
    df_users = create_and_run_aidd(
        config_name="users", 
        columns=columns, 
        num_records=NUM_USERS_TO_GENERATE, 
        output_filename="users_synthetic.csv"
    )
    save_ids_for_gretel(df_users, "gretel_user_id", "_for_gretel")
    print("--- Finished Generating Users ---")
    return df_users

# --- 3. Generate Products ---
NUM_PRODUCTS_TO_GENERATE = DEFAULT_NUM_RECORDS_TO_GENERATE * 3

def run_generate_products(df_categories_generated):
    print("\n--- Generating Products ---")
    gretel_user_ids = load_ids_for_gretel("gretel_user_id", "_for_gretel")
    
    gretel_category_ids_from_df = df_categories_generated["gretel_category_id"].tolist()
    category_id_to_name_map = pd.Series(df_categories_generated.category_name.values, index=df_categories_generated.gretel_category_id).to_dict()
    
    all_parent_ids = set(df_categories_generated['parent_gretel_category_id'].dropna().unique())
    leaf_category_gretel_ids = [cid for cid in gretel_category_ids_from_df if cid not in all_parent_ids]
    
    if not gretel_user_ids:
        print("Error: Missing user IDs for product generation. Ensure users were generated.")
        return pd.DataFrame()
    if not leaf_category_gretel_ids:
        print("Error: No leaf category IDs found for product generation. Ensure categories are defined correctly.")
        return pd.DataFrame()

    # Ensure temp_leaf_category_names has values before using in SamplerColumn
    temp_leaf_category_names = [category_id_to_name_map[cid] for cid in leaf_category_gretel_ids if cid in category_id_to_name_map]
    if not temp_leaf_category_names:
        print("Error: No leaf category names could be mapped for product generation prompts.")
        # This might happen if leaf_category_gretel_ids contains IDs not in category_id_to_name_map
        # Or if category_id_to_name_map is empty.
        return pd.DataFrame()

    columns = [
        SamplerColumn(name="gretel_product_id", type=P.SamplerType.UUID, params=P.UUIDSamplerParams()),
        SamplerColumn(name="seller_gretel_user_id", type=P.SamplerType.CATEGORY, params=P.CategorySamplerParams(values=gretel_user_ids)),
        SamplerColumn(name="product_gretel_category_id", type=P.SamplerType.CATEGORY, params=P.CategorySamplerParams(values=leaf_category_gretel_ids)),
        SamplerColumn(name="_temp_category_name_for_prompt", type=P.SamplerType.CATEGORY, params=P.CategorySamplerParams(values=temp_leaf_category_names)),
        SamplerColumn(name="condition", type=P.SamplerType.CATEGORY, params=P.CategorySamplerParams(values=["new", "like_new", "good", "fair", "poor"])),
        
        LLMTextColumn(name="title", prompt="Generate a realistic and appealing product title (under 100 characters) for an item in the '{{ record._temp_category_name_for_prompt }}' category. Make it specific. Examples: 'Apple MacBook Pro 14-inch M3 Pro 18GB 512GB SSD Space Black NEW SEALED', 'PSA 9 Mint 1999 Pokemon Base Set Charizard Holo #4', 'Nike Air Jordan 1 Retro High OG 'Lost & Found' - Size 10 Men - DS'."),
        LLMTextColumn(name="description", prompt="Write a detailed product description (a few paragraphs, under 500 characters) for '{{ record.title }}' (Category: '{{ record._temp_category_name_for_prompt }}'). Condition: '{{ record.condition }}'. Include key features, any flaws if not new, and what's included. Do not use markdown list formatting."),
        SamplerColumn(name="original_price_str", type=P.SamplerType.UNIFORM, params=P.UniformSamplerParams(low=1.00, high=3000.00, num_decimals=2), optional=0.8, convert_to="float"),
        SamplerColumn(name="is_active_str", type=P.SamplerType.BOOLEAN, params=P.BooleanSamplerParams(true_ratio=0.90)),
        SamplerColumn(name="created_at_str", type=P.SamplerType.DATETIME, params=P.DatetimeSamplerParams(begin_date="-1y", end_date="now")),
        SamplerColumn(name="updated_at_str", type=P.SamplerType.DATETIME, params=P.DatetimeSamplerParams(begin_date="-1y", end_date="now")),
        
        LLMTextColumn(name="image_description_1", prompt="Describe the main primary image for the product '{{ record.title }}'. Focus on key visual elements."),
        LLMTextColumn(name="image_description_2", prompt="Describe a secondary image showing a different angle or detail for '{{ record.title }}'.", optional=0.8),
        LLMTextColumn(name="image_description_3", prompt="Describe a third image, perhaps a close-up or packaging, for '{{ record.title }}'.", optional=0.5),
    ]
    
    df_products = create_and_run_aidd(
        config_name="products", 
        columns=columns, 
        num_records=NUM_PRODUCTS_TO_GENERATE, 
        output_filename="products_synthetic.csv"
    )
    save_ids_for_gretel(df_products, "gretel_product_id", "_for_gretel")
    print("--- Finished Generating Products ---")
    return df_products

# --- 4. Generate Streams ---
NUM_STREAMS_TO_GENERATE = NUM_USERS_TO_GENERATE // 3 if NUM_USERS_TO_GENERATE > 0 else 0


def run_generate_streams(df_categories_generated):
    print("\n--- Generating Streams ---")
    gretel_user_ids = load_ids_for_gretel("gretel_user_id", "_for_gretel")
    gretel_category_ids_from_df = df_categories_generated["gretel_category_id"].tolist()
    all_category_names = df_categories_generated["category_name"].unique().tolist()

    if not gretel_user_ids:
        print("Error: Missing user IDs for stream generation. Ensure users were generated.")
        return pd.DataFrame()
    if not gretel_category_ids_from_df:
        print("Error: Missing category IDs for stream generation.")
        return pd.DataFrame()
    if not all_category_names:
        print("Error: Missing category names for stream generation prompts.")
        return pd.DataFrame()
    if NUM_STREAMS_TO_GENERATE == 0:
        print("Skipping stream generation as number of users is too low or NUM_STREAMS_TO_GENERATE is 0.")
        return pd.DataFrame(columns=[ # Return empty DF with expected columns if possible
            "gretel_stream_id", "streamer_gretel_user_id", "stream_gretel_category_id", 
            "_temp_stream_category_name_for_prompt", "title", "description", 
            "thumbnail_url_template", "start_time_str", "duration_minutes_str", 
            "status_str", "is_private_str", "stream_key_placeholder", 
            "livekitRoomName_placeholder", "created_at_str", "updated_at_str"
        ])


    columns = [
        SamplerColumn(name="gretel_stream_id", type=P.SamplerType.UUID, params=P.UUIDSamplerParams()),
        SamplerColumn(name="streamer_gretel_user_id", type=P.SamplerType.CATEGORY, params=P.CategorySamplerParams(values=gretel_user_ids)),
        SamplerColumn(name="stream_gretel_category_id", type=P.SamplerType.CATEGORY, params=P.CategorySamplerParams(values=gretel_category_ids_from_df)),
        SamplerColumn(name="_temp_stream_category_name_for_prompt", type=P.SamplerType.CATEGORY, params=P.CategorySamplerParams(values=all_category_names)),
        LLMTextColumn(name="title", prompt="Generate a catchy title (under 100 characters) for a live stream about '{{ record._temp_stream_category_name_for_prompt }}'. Examples: 'Vintage Comic Book Haul & Sale!', 'Live Pokémon Card Box Breaks - Chasing Charizards!', 'Luxury Handbag Showcase & Auction'"),
        LLMTextColumn(name="description", prompt="Write a short description (1-2 sentences, under 250 chars) for a live stream titled '{{ record.title }}'. Mention what viewers can expect (e.g., auctions, unboxings, Q&A).", optional=0.7),
        SamplerColumn(name="thumbnail_url_template", type=P.SamplerType.CONSTANT, params=P.ConstantSamplerParams(value="https://picsum.photos/seed/stream_{{record.gretel_stream_id[:8]}}/320/180")),
        SamplerColumn(name="start_time_str", type=P.SamplerType.DATETIME, params=P.DatetimeSamplerParams(begin_date="-7d", end_date="+7d")),
        SamplerColumn(name="duration_minutes_str", type=P.SamplerType.UNIFORM, params=P.UniformSamplerParams(low=30, high=180), convert_to="int"),
        SamplerColumn(name="status_str", type=P.SamplerType.CATEGORY, params=P.CategorySamplerParams(values=["scheduled", "live", "ended", "cancelled"])),
        SamplerColumn(name="is_private_str", type=P.SamplerType.BOOLEAN, params=P.BooleanSamplerParams(true_ratio=0.1)),
        SamplerColumn(name="stream_key_placeholder", type=P.SamplerType.CONSTANT, params=P.ConstantSamplerParams(value="sk_synthetic_{{record.gretel_stream_id[:8]}}")),
        SamplerColumn(name="livekitRoomName_placeholder", type=P.SamplerType.CONSTANT, params=P.ConstantSamplerParams(value="lk_synthetic_{{record.gretel_stream_id[:8]}}")),
        SamplerColumn(name="created_at_str", type=P.SamplerType.DATETIME, params=P.DatetimeSamplerParams(begin_date="-30d", end_date="now")),
        SamplerColumn(name="updated_at_str", type=P.SamplerType.DATETIME, params=P.DatetimeSamplerParams(begin_date="-30d", end_date="now")),
    ]

    df_streams = create_and_run_aidd(
        config_name="streams",
        columns=columns,
        num_records=NUM_STREAMS_TO_GENERATE,
        output_filename="streams_synthetic.csv"
    )
    save_ids_for_gretel(df_streams, "gretel_stream_id", "_for_gretel")
    print("--- Finished Generating Streams ---")
    return df_streams

# --- Main Orchestration ---
if __name__ == "__main__":
    print("Starting Synthetic Data Generation using Gretel AIDD definitions...")

    df_categories = run_generate_categories()
    if df_categories.empty:
        print("Category generation failed or produced no data. Exiting.")
        exit(1) # Exiting early if core data is missing
    
    df_users = run_generate_users()
    if df_users.empty:
        print("User generation failed or produced no data. Exiting.")
        exit(1)

    df_products = run_generate_products(df_categories)
    if df_products.empty:
        print("Product generation failed or produced no data. Dependent steps might be affected. Exiting.")
        exit(1)

    df_streams = run_generate_streams(df_categories)
    if df_streams.empty and NUM_STREAMS_TO_GENERATE > 0: # Only warn if we expected streams
        print("Stream generation failed or produced no data.")
    elif NUM_STREAMS_TO_GENERATE == 0:
        print("Stream generation was skipped as per configuration.")


    print("\n🎉 Core entity generation definitions complete.")
    print(f"CSVs (with placeholder data as 'ATTEMPT_GRETEL_CLOUD_EXECUTION' is False or cloud calls are conceptual) are in: {OUTPUT_DIR}")
    print("Next steps: Define and run generation for auctions, bids, orders, and interactions.")