#!/usr/bin/env python3
"""
Business Analytics Model - Revenue Prediction & Business Intelligence
Chức năng: Phân tích kinh doanh và dự báo doanh thu
"""

import os
import sys
import json
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

import matplotlib.pyplot as plt
import seaborn as sns
from prophet import Prophet
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

class BusinessAnalytics:
    """Business Analytics and Revenue Prediction"""
    
    def __init__(self):
        self.revenue_model = None
        self.product_model = None
        self.customer_model = None
        self.sentiment_model = None
        
    def load_data(self, db_connector) -> Dict[str, pd.DataFrame]:
        """Load business data from database"""
        print("🔄 Loading business data...")
        
        # This would connect to your MySQL database
        # For now, we'll create sample data
        
        # Sample orders data
        orders_data = self._generate_sample_orders()
        
        # Sample products data
        products_data = self._generate_sample_products()
        
        # Sample customers data
        customers_data = self._generate_sample_customers()
        
        # Sample reviews data
        reviews_data = self._generate_sample_reviews()
        
        return {
            "orders": orders_data,
            "products": products_data,
            "customers": customers_data,
            "reviews": reviews_data
        }
    
    def _generate_sample_orders(self) -> pd.DataFrame:
        """Generate sample orders data"""
        np.random.seed(42)
        
        # Generate 1000 orders over the last 6 months
        start_date = datetime.now() - timedelta(days=180)
        dates = pd.date_range(start_date, periods=1000, freq='H')
        
        orders = []
        for i, date in enumerate(dates):
            orders.append({
                'id': i + 1,
                'customer_id': np.random.randint(1, 100),
                'product_id': np.random.randint(1, 50),
                'quantity': np.random.randint(1, 5),
                'price': np.random.uniform(100000, 2000000),
                'total_amount': 0,  # Will calculate
                'created_at': date,
                'status': np.random.choice(['completed', 'pending', 'cancelled'], p=[0.8, 0.15, 0.05])
            })
        
        df = pd.DataFrame(orders)
        df['total_amount'] = df['quantity'] * df['price']
        
        return df
    
    def _generate_sample_products(self) -> pd.DataFrame:
        """Generate sample products data"""
        products = []
        
        categories = ['Bàn làm việc', 'Ghế văn phòng', 'Tủ hồ sơ', 'Kệ sách', 'Bàn ghế phòng họp']
        
        for i in range(1, 51):
            products.append({
                'id': i,
                'name': f'Sản phẩm {i}',
                'category': np.random.choice(categories),
                'price': np.random.uniform(500000, 3000000),
                'cost': np.random.uniform(300000, 2000000),
                'stock_quantity': np.random.randint(0, 100),
                'created_at': datetime.now() - timedelta(days=np.random.randint(1, 365))
            })
        
        return pd.DataFrame(products)
    
    def _generate_sample_customers(self) -> pd.DataFrame:
        """Generate sample customers data"""
        customers = []
        
        for i in range(1, 101):
            customers.append({
                'id': i,
                'name': f'Khách hàng {i}',
                'email': f'customer{i}@example.com',
                'phone': f'090{i:07d}',
                'address': f'Địa chỉ {i}',
                'created_at': datetime.now() - timedelta(days=np.random.randint(1, 365)),
                'total_orders': np.random.randint(1, 20),
                'total_spent': np.random.uniform(1000000, 50000000)
            })
        
        return pd.DataFrame(customers)
    
    def _generate_sample_reviews(self) -> pd.DataFrame:
        """Generate sample reviews data"""
        reviews = []
        
        sentiments = ['positive', 'negative', 'neutral']
        
        for i in range(1, 501):
            reviews.append({
                'id': i,
                'product_id': np.random.randint(1, 51),
                'customer_id': np.random.randint(1, 101),
                'rating': np.random.randint(1, 6),
                'comment': f'Đánh giá {i}',
                'sentiment': np.random.choice(sentiments, p=[0.6, 0.2, 0.2]),
                'created_at': datetime.now() - timedelta(days=np.random.randint(1, 180))
            })
        
        return pd.DataFrame(reviews)
    
    def prepare_revenue_data(self, orders_df: pd.DataFrame) -> pd.DataFrame:
        """Prepare revenue data for Prophet"""
        print("🔄 Preparing revenue data...")
        
        # Filter completed orders
        completed_orders = orders_df[orders_df['status'] == 'completed'].copy()
        
        # Group by date
        daily_revenue = completed_orders.groupby(completed_orders['created_at'].dt.date)['total_amount'].sum().reset_index()
        daily_revenue.columns = ['ds', 'y']
        
        # Fill missing dates with 0
        date_range = pd.date_range(start=daily_revenue['ds'].min(), end=daily_revenue['ds'].max(), freq='D')
        full_df = pd.DataFrame({'ds': date_range})
        daily_revenue = full_df.merge(daily_revenue, on='ds', how='left').fillna(0)
        
        print(f"📊 Revenue data prepared: {len(daily_revenue)} days")
        return daily_revenue
    
    def train_revenue_model(self, revenue_df: pd.DataFrame) -> Dict[str, Any]:
        """Train Prophet model for revenue prediction"""
        print("🚀 Training revenue prediction model...")
        
        # Initialize Prophet
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode='multiplicative'
        )
        
        # Add custom seasonalities
        model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
        
        # Fit model
        model.fit(revenue_df)
        
        # Make future predictions (next 30 days)
        future = model.make_future_dataframe(periods=30)
        forecast = model.predict(future)
        
        # Calculate metrics
        train_data = forecast[:-30]  # Exclude future predictions
        mae = mean_absolute_error(revenue_df['y'], train_data['yhat'])
        rmse = np.sqrt(mean_squared_error(revenue_df['y'], train_data['yhat']))
        r2 = r2_score(revenue_df['y'], train_data['yhat'])
        
        # Save model
        model_path = "models/business/revenue_prophet_model.pkl"
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        
        import pickle
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)
        
        self.revenue_model = model
        
        results = {
            "model_path": model_path,
            "metrics": {
                "mae": mae,
                "rmse": rmse,
                "r2": r2
            },
            "forecast": forecast.tail(30).to_dict('records')
        }
        
        print(f"✅ Revenue model trained - R²: {r2:.4f}")
        return results
    
    def analyze_product_performance(self, orders_df: pd.DataFrame, products_df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze product performance"""
        print("🔄 Analyzing product performance...")
        
        # Merge orders with products
        merged_df = orders_df.merge(products_df, left_on='product_id', right_on='id', how='left')
        
        # Product performance metrics
        product_metrics = merged_df.groupby('product_id').agg({
            'total_amount': ['sum', 'count', 'mean'],
            'quantity': 'sum',
            'category': 'first',
            'name': 'first'
        }).round(2)
        
        product_metrics.columns = ['total_revenue', 'order_count', 'avg_order_value', 'total_quantity', 'category', 'name']
        product_metrics = product_metrics.reset_index()
        
        # Top products
        top_products = product_metrics.nlargest(10, 'total_revenue')
        
        # Category performance
        category_performance = merged_df.groupby('category').agg({
            'total_amount': ['sum', 'count', 'mean'],
            'quantity': 'sum'
        }).round(2)
        
        category_performance.columns = ['total_revenue', 'order_count', 'avg_order_value', 'total_quantity']
        category_performance = category_performance.reset_index()
        
        return {
            "top_products": top_products.to_dict('records'),
            "category_performance": category_performance.to_dict('records'),
            "total_products": len(product_metrics),
            "total_categories": len(category_performance)
        }
    
    def analyze_customer_segments(self, orders_df: pd.DataFrame, customers_df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze customer segments"""
        print("🔄 Analyzing customer segments...")
        
        # Customer metrics
        customer_metrics = orders_df.groupby('customer_id').agg({
            'total_amount': ['sum', 'count', 'mean'],
            'created_at': ['min', 'max']
        }).round(2)
        
        customer_metrics.columns = ['total_spent', 'order_count', 'avg_order_value', 'first_order', 'last_order']
        customer_metrics = customer_metrics.reset_index()
        
        # Calculate customer lifetime value (CLV)
        customer_metrics['clv'] = customer_metrics['total_spent'] * customer_metrics['order_count']
        
        # Customer segments based on spending
        customer_metrics['segment'] = pd.cut(
            customer_metrics['total_spent'],
            bins=[0, 1000000, 5000000, float('inf')],
            labels=['Low Value', 'Medium Value', 'High Value']
        )
        
        segment_analysis = customer_metrics.groupby('segment').agg({
            'customer_id': 'count',
            'total_spent': ['sum', 'mean'],
            'order_count': 'mean',
            'clv': 'mean'
        }).round(2)
        
        segment_analysis.columns = ['customer_count', 'total_revenue', 'avg_spending', 'avg_orders', 'avg_clv']
        segment_analysis = segment_analysis.reset_index()
        
        return {
            "customer_segments": segment_analysis.to_dict('records'),
            "top_customers": customer_metrics.nlargest(10, 'total_spent').to_dict('records'),
            "total_customers": len(customer_metrics)
        }
    
    def generate_business_report(self, data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """Generate comprehensive business report"""
        print("📊 Generating business report...")
        
        orders_df = data['orders']
        products_df = data['products']
        customers_df = data['customers']
        reviews_df = data['reviews']
        
        # Revenue analysis
        revenue_df = self.prepare_revenue_data(orders_df)
        revenue_results = self.train_revenue_model(revenue_df)
        
        # Product analysis
        product_results = self.analyze_product_performance(orders_df, products_df)
        
        # Customer analysis
        customer_results = self.analyze_customer_segments(orders_df, customers_df)
        
        # Review analysis
        review_summary = reviews_df.groupby('sentiment').size().to_dict()
        
        # Overall metrics
        total_revenue = orders_df[orders_df['status'] == 'completed']['total_amount'].sum()
        total_orders = len(orders_df[orders_df['status'] == 'completed'])
        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
        
        report = {
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_revenue": total_revenue,
                "total_orders": total_orders,
                "avg_order_value": avg_order_value,
                "total_products": len(products_df),
                "total_customers": len(customers_df),
                "total_reviews": len(reviews_df)
            },
            "revenue_forecast": revenue_results,
            "product_analysis": product_results,
            "customer_analysis": customer_results,
            "review_sentiment": review_summary
        }
        
        # Save report
        report_path = "reports/business_report.json"
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2, default=str)
        
        print(f"✅ Business report saved to {report_path}")
        return report
    
    def create_visualizations(self, report: Dict[str, Any]) -> List[str]:
        """Create business visualizations"""
        print("📈 Creating visualizations...")
        
        viz_paths = []
        
        # Revenue forecast chart
        if 'revenue_forecast' in report:
            forecast_data = report['revenue_forecast']['forecast']
            
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=[item['ds'] for item in forecast_data],
                y=[item['yhat'] for item in forecast_data],
                mode='lines',
                name='Revenue Forecast',
                line=dict(color='blue')
            ))
            
            fig.update_layout(
                title='Revenue Forecast (Next 30 Days)',
                xaxis_title='Date',
                yaxis_title='Revenue (VND)',
                template='plotly_white'
            )
            
            viz_path = "reports/revenue_forecast.html"
            fig.write_html(viz_path)
            viz_paths.append(viz_path)
        
        # Product performance chart
        if 'product_analysis' in report:
            top_products = report['product_analysis']['top_products'][:10]
            
            fig = px.bar(
                x=[p['name'] for p in top_products],
                y=[p['total_revenue'] for p in top_products],
                title='Top 10 Products by Revenue',
                labels={'x': 'Product', 'y': 'Revenue (VND)'}
            )
            
            viz_path = "reports/product_performance.html"
            fig.write_html(viz_path)
            viz_paths.append(viz_path)
        
        print(f"✅ Created {len(viz_paths)} visualizations")
        return viz_paths

def main():
    """Main business analytics function"""
    print("🚀 Business Analytics & Revenue Prediction")
    print("=" * 50)
    
    # Initialize analytics
    analytics = BusinessAnalytics()
    
    try:
        # Load data
        data = analytics.load_data(None)  # Pass None for sample data
        
        # Generate report
        report = analytics.generate_business_report(data)
        
        # Create visualizations
        viz_paths = analytics.create_visualizations(report)
        
        print("\n🎉 Business analytics completed!")
        print(f"📊 Total Revenue: {report['summary']['total_revenue']:,.0f} VND")
        print(f"📊 Total Orders: {report['summary']['total_orders']}")
        print(f"📊 Avg Order Value: {report['summary']['avg_order_value']:,.0f} VND")
        
        print(f"\n📈 Visualizations created:")
        for path in viz_paths:
            print(f"  - {path}")
        
    except Exception as e:
        print(f"❌ Business analytics failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

