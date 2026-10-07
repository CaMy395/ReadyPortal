import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContentStudio from './ContentStudio';

const draft={id:1,title:'Bridal Mix N’ Sip',caption:'Cheers to the bride!',platform:'instagram',status:'draft',media_id:2,mime:'video/mp4',media_name:'mix.mp4'};
beforeEach(()=>{
  window.fetch=jest.fn(async(url,options={})=>{
    if(url.endsWith('/config')) return {ok:true,json:async()=>({instagramReady:false,canPublish:false})};
    if(url.endsWith('/posts') && !options.method) return {ok:true,json:async()=>[draft]};
    if(url.includes('/media/')) return {ok:false};
    return {ok:true,json:async()=>({...draft,status:'draft'})};
  });
  window.scrollTo=jest.fn();
});
test('disables Instagram publishing until configured without blocking preparation',async()=>{
  render(<ContentStudio/>);
  await screen.findByText('Bridal Mix N’ Sip');
  expect(screen.getByRole('button',{name:'Publish now'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'Edit draft'})).toBeEnabled();
  expect(screen.getByText(/TikTok times are posting plans/)).toBeInTheDocument();
});
test('reuse shares assets while allowing a separate TikTok caption',async()=>{
  render(<ContentStudio/>);await screen.findByText('Bridal Mix N’ Sip');
  fireEvent.click(screen.getByRole('button',{name:'Reuse for TikTok'}));
  expect(screen.getByLabelText('Platform')).toHaveValue('tiktok');
  fireEvent.change(screen.getByLabelText('Caption'),{target:{value:'Shake, sip, celebrate!'}});
  fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
  await waitFor(()=>expect(window.fetch).toHaveBeenCalledWith(expect.stringContaining('/posts'),expect.objectContaining({method:'POST'})));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Save draft'})).toBeEnabled());
  const call=window.fetch.mock.calls.find(([,options])=>options?.method==='POST');
  expect(JSON.parse(call[1].body)).toMatchObject({platform:'tiktok',media_id:2,caption:'Shake, sip, celebrate!'});
});
test('editing updates the existing draft instead of making another one',async()=>{
  render(<ContentStudio/>);await screen.findByText('Bridal Mix N’ Sip');
  fireEvent.click(screen.getByRole('button',{name:'Edit draft'}));
  fireEvent.change(screen.getByLabelText('Caption'),{target:{value:'Updated caption'}});
  fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
  await waitFor(()=>expect(window.fetch).toHaveBeenCalledWith(expect.stringContaining('/posts/1'),expect.objectContaining({method:'PUT'})));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Save draft'})).toBeEnabled());
});
